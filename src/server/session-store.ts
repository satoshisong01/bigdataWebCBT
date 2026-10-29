/**
 * Server-only: session rows (docs §7.2). Stored timestamps always use DB time (now()).
 */
import { PERSISTENT_SESSION_DAYS } from '@/lib/sync/protocol';
import type { DbTx } from './db';
import { hashSessionToken, isWellFormedToken, newSessionToken, sessionDays, shouldRenew } from './session';

export interface ResolvedSession {
  userId: number;
  username: string;
  tokenHash: string;
  persistent: boolean;
  /** expires_at was just pushed to now + 400 days, so the cookie must be re-sent */
  renewed: boolean;
}

interface SessionRow {
  user_id: string;
  username: string;
  persistent: boolean;
  expires_at: Date;
}

/** Creates a session and returns the raw token for the cookie; drops the user's expired rows. */
export async function createSession(db: DbTx, userId: number, persistent: boolean): Promise<string> {
  const { token, tokenHash } = newSessionToken();
  await db.query(`delete from ${db.s}.sessions where user_id = $1 and expires_at <= now()`, [userId]);
  await db.query(
    `insert into ${db.s}.sessions (token_hash, user_id, persistent, expires_at)
     values ($1, $2, $3, now() + make_interval(days => $4))`,
    [tokenHash, userId, persistent, sessionDays(persistent)],
  );
  return token;
}

/** The live session for a cookie token (sliding renewal applied), or null. */
export async function resolveSession(
  db: DbTx,
  token: string | undefined,
  now: Date = new Date(),
): Promise<ResolvedSession | null> {
  if (!isWellFormedToken(token)) return null;
  const tokenHash = hashSessionToken(token);
  const { rows } = await db.query<SessionRow>(
    `select s.user_id, u.username, s.persistent, s.expires_at
       from ${db.s}.sessions s join ${db.s}.users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  const session = { userId: Number(row.user_id), username: row.username, tokenHash, persistent: row.persistent };
  if (!shouldRenew(row.persistent, row.expires_at, now)) return { ...session, renewed: false };
  await db.query(
    `update ${db.s}.sessions
        set expires_at = now() + make_interval(days => $2), last_seen_at = now()
      where token_hash = $1`,
    [tokenHash, PERSISTENT_SESSION_DAYS],
  );
  return { ...session, renewed: true };
}

export async function deleteSession(db: DbTx, token: string): Promise<void> {
  await db.query(`delete from ${db.s}.sessions where token_hash = $1`, [hashSessionToken(token)]);
}

export async function revokeOtherSessions(db: DbTx, userId: number, keepTokenHash: string): Promise<void> {
  await db.query(`delete from ${db.s}.sessions where user_id = $1 and token_hash <> $2`, [userId, keepTokenHash]);
}
