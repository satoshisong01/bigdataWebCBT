/**
 * Server-only: credential checks with the DB-backed lockout of docs §7.2, and password change.
 * The lockout is race-free: every attempt is reserved atomically before scrypt runs.
 * Failures always map to one generic message so responses never reveal which part was wrong.
 */
import type { MeData } from '@/lib/sync/protocol';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isAcceptableNewPassword,
  isValidUsername,
  normalizeUsername,
} from './account-rules';
import type { Db, DbTx } from './db';
import { hashPassword, verifyDummy, verifyPassword } from './password';
import { createRateLimiter } from './rate-limit';
import type { RateLimiter } from './rate-limit';
import { revokeOtherSessions } from './session-store';

export const MAX_FAILED_ATTEMPTS = 10;
export const LOCK_MINUTES = 15;

export const AUTH_MSG = {
  invalid: '아이디 또는 비밀번호가 올바르지 않습니다',
  locked: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요',
  wrongCurrent: '현재 비밀번호가 올바르지 않습니다',
  weakPassword: `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요 (8자 이상 권장)`,
} as const;

export type CredentialResult = { kind: 'ok'; user: MeData } | { kind: 'invalid' } | { kind: 'locked' };
export type PasswordChangeResult = { kind: 'ok' } | { kind: 'invalid' } | { kind: 'locked' } | { kind: 'weak' };

interface ReservedRow {
  id: string;
  username: string;
  password_hash: string;
  /** true when this reservation was the attempt that reached the lockout threshold */
  locked: boolean;
}

/**
 * Atomically reserves one attempt BEFORE the (slow) password check: a single UPDATE row-locks the
 * account, skips it while locked, counts the attempt and — on the 10th (or any later one until a
 * success) — starts the 15-minute lock. Concurrent requests therefore can never verify more than
 * the allowed number of guesses. A success refunds everything (counter 0, lock cleared).
 */
const RESERVE_SQL = (s: string, where: string): string =>
  `update ${s}.users
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= $2
                              then now() + make_interval(mins => $3) else locked_until end
    where ${where} and (locked_until is null or locked_until <= now())
    returning id, username, password_hash, coalesce(locked_until > now(), false) as locked`;

async function reserveAttempt(db: DbTx, where: string, key: string | number): Promise<ReservedRow | undefined> {
  const { rows } = await db.query<ReservedRow>(RESERVE_SQL(db.s, where), [key, MAX_FAILED_ATTEMPTS, LOCK_MINUTES]);
  return rows[0];
}

/** Verifies a reserved attempt; a failure keeps the reservation (it was already counted). */
async function settleAttempt(db: DbTx, row: ReservedRow, password: string, isLogin: boolean): Promise<CredentialResult> {
  if (!(await verifyPassword(password, row.password_hash))) {
    return row.locked ? { kind: 'locked' } : { kind: 'invalid' };
  }
  const touchLogin = isLogin ? ', last_login_at = now()' : '';
  await db.query(`update ${db.s}.users set failed_attempts = 0, locked_until = null${touchLogin} where id = $1`, [row.id]);
  return { kind: 'ok', user: { userId: Number(row.id), username: row.username } };
}

/**
 * Unknown usernames lock like real accounts (per instance, best effort), so a 429 does not reveal
 * that an account exists. Limit MAX-1: the 10th failure in the window answers "locked".
 */
const unknownUserFailures: RateLimiter = createRateLimiter({
  limit: MAX_FAILED_ATTEMPTS - 1,
  windowMs: LOCK_MINUTES * 60_000,
  maxKeys: 5_000,
});

export async function attemptLogin(db: DbTx, rawUsername: string, password: string): Promise<CredentialResult> {
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    await verifyDummy(password);
    return { kind: 'invalid' };
  }
  const row = await reserveAttempt(db, 'username = $1', username);
  if (row) return settleAttempt(db, row, password, true);
  // locked or unknown: spend the same scrypt time either way so timing does not tell them apart
  await verifyDummy(password);
  const exists = await db.query(`select 1 from ${db.s}.users where username = $1`, [username]);
  if (exists.rows.length > 0) return { kind: 'locked' };
  return unknownUserFailures.hit(username).allowed ? { kind: 'invalid' } : { kind: 'locked' };
}

/** Verifies the current password (counts toward the lockout), stores the new one, revokes other sessions. */
export async function changePassword(
  db: Db,
  session: { userId: number; tokenHash: string },
  current: string,
  next: string,
): Promise<PasswordChangeResult> {
  if (!isAcceptableNewPassword(next)) return { kind: 'weak' };
  const row = await reserveAttempt(db, 'id = $1', session.userId);
  if (!row) {
    const exists = await db.query(`select 1 from ${db.s}.users where id = $1`, [session.userId]);
    return exists.rows.length > 0 ? { kind: 'locked' } : { kind: 'invalid' };
  }
  const check = await settleAttempt(db, row, current, false);
  if (check.kind !== 'ok') return check;
  const hash = await hashPassword(next);
  await db.transaction(async (tx) => {
    await tx.query(`update ${tx.s}.users set password_hash = $2 where id = $1`, [session.userId, hash]);
    await revokeOtherSessions(tx, session.userId, session.tokenHash);
  });
  return { kind: 'ok' };
}
