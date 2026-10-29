// @vitest-environment node
/** Lockout of docs §7.2 without a DB: the attempt is reserved atomically before scrypt runs. */
import type { QueryResult, QueryResultRow } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS, attemptLogin, changePassword } from './auth';
import type { Db, DbTx } from './db';
import { hashPassword } from './password';

const PASS = 'right-pass-1';
let hash = '';

interface Call {
  text: string;
  values?: readonly unknown[];
}

type Responder = (text: string) => QueryResultRow[];

function fakeDb(respond: Responder): { db: Db; calls: Call[] } {
  const calls: Call[] = [];
  const tx: DbTx = {
    s: '"s"',
    query: async <R extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) => {
      calls.push({ text: text.replace(/\s+/g, ' ').trim(), values });
      const rows = respond(text) as R[];
      return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } as QueryResult<R>;
    },
  };
  return { db: { ...tx, transaction: (fn) => fn(tx) }, calls };
}

const reserved = (locked: boolean): Responder => (text) =>
  text.includes('failed_attempts + 1') ? [{ id: '7', username: 'alice', password_hash: hash, locked }] : [];

beforeAll(async () => {
  hash = await hashPassword(PASS);
});

describe('attemptLogin', () => {
  it('reserves the attempt (skipping locked accounts) before verifying, then refunds it on success', async () => {
    const { db, calls } = fakeDb(reserved(false));
    expect(await attemptLogin(db, ' Alice ', PASS)).toEqual({ kind: 'ok', user: { userId: 7, username: 'alice' } });
    expect(calls[0].text).toContain('set failed_attempts = failed_attempts + 1');
    expect(calls[0].text).toContain('where username = $1 and (locked_until is null or locked_until <= now())');
    expect(calls[0].values).toEqual(['alice', MAX_FAILED_ATTEMPTS, LOCK_MINUTES]);
    expect(calls[1].text).toContain('set failed_attempts = 0, locked_until = null, last_login_at = now() where id = $1');
  });

  it('a wrong password keeps the reservation; the one that reached the limit answers locked', async () => {
    const counted = fakeDb(reserved(false));
    expect(await attemptLogin(counted.db, 'alice', 'wrong-pass')).toEqual({ kind: 'invalid' });
    expect(counted.calls).toHaveLength(1);
    expect(await attemptLogin(fakeDb(reserved(true)).db, 'alice', 'wrong-pass')).toEqual({ kind: 'locked' });
  });

  it('a locked account is never verified, even with the right password', async () => {
    const { db, calls } = fakeDb((text) => (text.startsWith('select 1') ? [{ '?column?': 1 }] : []));
    expect(await attemptLogin(db, 'alice', PASS)).toEqual({ kind: 'locked' });
    expect(calls.some((c) => c.text.includes('failed_attempts = 0'))).toBe(false);
  });

  it('unknown usernames lock like real accounts, so a 429 does not reveal an account', async () => {
    const { db } = fakeDb(() => []);
    const results = [];
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) results.push((await attemptLogin(db, 'ghost-user', 'x')).kind);
    expect(results.slice(0, MAX_FAILED_ATTEMPTS - 1).every((k) => k === 'invalid')).toBe(true);
    expect(results.at(-1)).toBe('locked');
  });
});

describe('changePassword', () => {
  it('counts the current-password check through the same reservation', async () => {
    const { db, calls } = fakeDb(reserved(false));
    const session = { userId: 7, tokenHash: 'h' };
    expect(await changePassword(db, session, 'wrong-pass', 'new-pass-1')).toEqual({ kind: 'invalid' });
    expect(calls[0].text).toContain('where id = $1 and (locked_until is null or locked_until <= now())');
  });
});
