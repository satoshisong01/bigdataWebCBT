// @vitest-environment node
/**
 * Opt-in DB integration test:  RUN_DB_TESTS=1 npx vitest run src/server/integration.test.ts
 * Connects with the DB_* settings of .env.local but works ONLY in a temporary schema
 * bigdata_it_<random> (created by the ops script, dropped at the end); the configured schema is
 * never touched. Exercises the ops script and the real Route Handlers end to end.
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as logoutRoute } from '@/app/api/auth/logout/route';
import { GET as meRoute } from '@/app/api/auth/me/route';
import { POST as passwordRoute } from '@/app/api/auth/password/route';
import { POST as syncRoute } from '@/app/api/sync/route';
import { SESSION_COOKIE, SYNC_LIMITS } from '@/lib/sync/protocol';
import type { SyncChange, SyncNs, SyncResponseData } from '@/lib/sync/protocol';
import { AUTH_MSG } from './auth';
import { closeDb, createDb } from './db';
import type { Db } from './db';
import { buildPoolConfig } from './db-config';
import { describeError, readDbEnv } from './env';
import { missingEnv, parseEnvFile } from './env-file';
import { SYNC_MSG } from './sync-plan';

const RUN = process.env.RUN_DB_TESTS === '1';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = path.join(ROOT, 'scripts', 'db-setup.mjs');
const SCHEMA = `bigdata_it_${randomBytes(4).toString('hex')}`;
const TEMP_SCHEMA_RE = /^bigdata_it_[0-9a-f]{8}$/;
const PASS_1 = 'it-first-pass-1';
const PASS_2 = 'it-second-pass-2';
const PASS_3 = 'it-third-pass-3';
const PERSISTENT_SECONDS = 400 * 86_400;
const T0 = '2026-10-01T00:00:00.000Z';
const T1 = '2026-10-02T00:00:00.000Z';
const T2 = '2026-10-03T00:00:00.000Z';

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
const change = (ns: SyncNs, key: string, value: unknown, updatedAt: string): SyncChange => ({ ns, key, value, updatedAt });

interface ScriptResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runScript(args: string[], extraEnv: Record<string, string> = {}): ScriptResult {
  // undefined entries are not passed to the child, so NEW_USER_PASSWORD only exists when given
  const env: NodeJS.ProcessEnv = { ...process.env, NEW_USER_PASSWORD: undefined, DB_SCHEMA: SCHEMA, ...extraEnv };
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, stdout: (e.stdout ?? '').trim(), stderr: (e.stderr ?? '').trim() };
  }
}

let requestCount = 0;

/** Every request gets its own client IP so the per-IP rate limiters stay out of the way. */
function makeRequest(route: string, method: 'GET' | 'POST', token?: string, body: unknown = {}, contentType = 'application/json'): NextRequest {
  requestCount += 1;
  const headers = new Headers({ 'x-forwarded-for': `198.18.${Math.floor(requestCount / 250)}.${requestCount % 250}` });
  if (method === 'POST') headers.set('content-type', contentType);
  if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`);
  return new NextRequest(`http://localhost${route}`, { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined });
}

async function login(username: string, password: string, remember = true) {
  const res = await loginRoute(makeRequest('/api/auth/login', 'POST', undefined, { username, password, remember }));
  return { res, token: res.cookies.get(SESSION_COOKIE)?.value ?? '' };
}

async function meStatus(token: string): Promise<number> {
  return (await meRoute(makeRequest('/api/auth/me', 'GET', token))).status;
}

interface SyncCall {
  status: number;
  data: SyncResponseData;
  error?: string;
}

async function sync(token: string, cursor: string, changes: SyncChange[], device = 'dev-a'): Promise<SyncCall> {
  const res = await syncRoute(makeRequest('/api/sync', 'POST', token, { device, cursor, changes }));
  const payload = (await res.json()) as { ok: boolean; data: SyncResponseData; error?: string };
  return { status: res.status, data: payload.data, error: payload.error };
}

describe.skipIf(!RUN)('auth + sync against PostgreSQL (temporary schema)', { timeout: 120_000 }, () => {
  let pool: Pool | undefined;
  let db: Db;
  let addedEnv: string[] = [];
  let token = '';
  let browserToken = '';
  let cursor = '0';

  beforeAll(async () => {
    expect(SCHEMA).toMatch(TEMP_SCHEMA_RE);
    const fileEnv = parseEnvFile(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8'));
    expect(SCHEMA).not.toBe(fileEnv.DB_SCHEMA);
    const additions = { ...missingEnv(fileEnv, process.env), DB_SCHEMA: SCHEMA };
    addedEnv = Object.keys(additions);
    Object.assign(process.env, additions); // the Route Handlers' getDb() reads this lazily
    await closeDb();
    pool = new Pool(buildPoolConfig(readDbEnv(process.env)));
    try {
      await pool.query('select 1');
    } catch (err) {
      throw new Error(`DB not reachable: ${describeError(err)}`);
    }
    db = createDb(pool, SCHEMA);
  }, 60_000);

  afterAll(async () => {
    await closeDb();
    if (pool) {
      if (TEMP_SCHEMA_RE.test(SCHEMA)) await pool.query(`drop schema if exists "${SCHEMA}" cascade`);
      await pool.end();
    }
    for (const key of addedEnv) delete process.env[key];
  }, 60_000);

  it('migrate creates the schema and tables once, then is a no-op', async () => {
    expect(runScript(['migrate'])).toMatchObject({ status: 0, stdout: 'migrate: applied 001_auth, 002_sync' });
    expect(runScript(['migrate'])).toMatchObject({ status: 0, stdout: 'migrate: already up to date' });
    const tables = await db.query<{ table_name: string }>(
      'select table_name from information_schema.tables where table_schema = $1 order by table_name',
      [SCHEMA],
    );
    expect(tables.rows.map((r) => r.table_name)).toEqual(['schema_migrations', 'sessions', 'sync_records', 'users']);
    const seq = await db.query<{ sequence_name: string }>(
      'select sequence_name from information_schema.sequences where sequence_schema = $1 order by 1',
      [SCHEMA],
    );
    expect(seq.rows.map((r) => r.sequence_name)).toEqual(['sync_version_seq', 'users_id_seq']);
  });

  it('create-user creates, resets password + lockout, and needs NEW_USER_PASSWORD', async () => {
    expect(runScript(['create-user', 'IT_User'], { NEW_USER_PASSWORD: PASS_1 })).toMatchObject({ status: 0, stdout: 'created' });
    await db.query(`update ${db.s}.users set failed_attempts = 7, locked_until = now() + interval '1 hour'`);
    expect(runScript(['create-user', 'it_user'], { NEW_USER_PASSWORD: PASS_2 })).toMatchObject({ status: 0, stdout: 'updated' });
    const { rows } = await db.query(`select failed_attempts, locked_until, password_hash from ${db.s}.users`);
    expect(rows[0]).toMatchObject({ failed_attempts: 0, locked_until: null });
    expect(rows[0].password_hash).toMatch(/^scrypt\$16384\$8\$1\$/);

    const missing = runScript(['create-user', 'nobody']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('NEW_USER_PASSWORD');
    expect(runScript(['create-user', 'other_user'], { NEW_USER_PASSWORD: PASS_1 }).stdout).toBe('created');
    expect(runScript(['users']).stdout.split(/\r?\n/)).toEqual(['users: 2', 'it_user', 'other_user']);
  });

  it('login sets a 400-day HttpOnly cookie and stores only sha256(token)', async () => {
    const { res, token: t } = await login('IT_User', PASS_2);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; data: { userId: number; username: string } };
    expect(body).toMatchObject({ ok: true, data: { username: 'it_user' } });
    expect(Number.isInteger(body.data.userId)).toBe(true);
    expect(res.cookies.get(SESSION_COOKIE)).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: PERSISTENT_SECONDS });
    token = t;
    const { rows } = await db.query(
      `select token_hash, persistent, expires_at > now() + interval '399 days' as far from ${db.s}.sessions`,
    );
    expect(rows).toEqual([{ token_hash: sha256(token), persistent: true, far: true }]);

    const me = await meRoute(makeRequest('/api/auth/me', 'GET', token));
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual(body);
    expect(me.headers.get('set-cookie')).toBeNull();
    expect(me.headers.get('cache-control')).toBe('no-store');
  });

  it('wrong password and unknown user share one generic 401', async () => {
    for (const attempt of [await login('it_user', 'wrong-password'), await login('nobody_here', 'wrong-password')]) {
      expect(attempt.res.status).toBe(401);
      expect(await attempt.res.json()).toEqual({ ok: false, error: AUTH_MSG.invalid });
      expect(attempt.token).toBe('');
    }
  });

  it('remember=false: browser-session cookie, 1-day row that never slides', async () => {
    const { res, token: t } = await login('it_user', PASS_2, false);
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).not.toMatch(/max-age|expires/i);
    browserToken = t;
    const { rows } = await db.query(
      `select persistent, expires_at between now() + interval '23 hours' and now() + interval '25 hours' as one_day
         from ${db.s}.sessions where token_hash = $1`,
      [sha256(t)],
    );
    expect(rows).toEqual([{ persistent: false, one_day: true }]);
    await db.query(`update ${db.s}.sessions set expires_at = now() + interval '1 hour' where token_hash = $1`, [sha256(t)]);
    const me = await meRoute(makeRequest('/api/auth/me', 'GET', t));
    expect(me.status).toBe(200);
    expect(me.headers.get('set-cookie')).toBeNull();
  });

  it('a persistent session slides once its last extension is over a day old', async () => {
    await db.query(`update ${db.s}.sessions set expires_at = now() + interval '398 days' where token_hash = $1`, [sha256(token)]);
    const me = await meRoute(makeRequest('/api/auth/me', 'GET', token));
    expect(me.status).toBe(200);
    expect(me.cookies.get(SESSION_COOKIE)).toMatchObject({ value: token, maxAge: PERSISTENT_SECONDS });
    const { rows } = await db.query(
      `select expires_at > now() + interval '399 days' as renewed from ${db.s}.sessions where token_hash = $1`,
      [sha256(token)],
    );
    expect(rows[0].renewed).toBe(true);
    expect((await meRoute(makeRequest('/api/auth/me', 'GET', token))).headers.get('set-cookie')).toBeNull();
  });

  it('an expired session is refused and its cookie cleared', async () => {
    const { token: t } = await login('it_user', PASS_2);
    await db.query(`update ${db.s}.sessions set expires_at = now() - interval '1 second' where token_hash = $1`, [sha256(t)]);
    const me = await meRoute(makeRequest('/api/auth/me', 'GET', t));
    expect(me.status).toBe(401);
    expect(me.cookies.get(SESSION_COOKIE)).toMatchObject({ value: '', maxAge: 0 });
  });

  it('10 failures lock the account for 15 minutes; a later success resets the counter', async () => {
    await db.query(`update ${db.s}.users set failed_attempts = 0, locked_until = null where username = 'it_user'`);
    for (let i = 1; i <= 9; i += 1) expect((await login('it_user', `wrong-${i}`)).res.status).toBe(401);
    const tenth = await login('it_user', 'wrong-10');
    expect(tenth.res.status).toBe(429);
    expect(await tenth.res.json()).toEqual({ ok: false, error: AUTH_MSG.locked });
    const blocked = await login('it_user', PASS_2);
    expect(blocked.res.status).toBe(429);
    expect(blocked.token).toBe('');
    const locked = await db.query(
      `select failed_attempts, locked_until between now() + interval '14 minutes' and now() + interval '16 minutes' as fifteen
         from ${db.s}.users where username = 'it_user'`,
    );
    expect(locked.rows[0]).toEqual({ failed_attempts: 10, fifteen: true });

    await db.query(`update ${db.s}.users set locked_until = now() - interval '1 second' where username = 'it_user'`);
    expect((await login('it_user', PASS_2)).res.status).toBe(200);
    const reset = await db.query(
      `select failed_attempts, locked_until, last_login_at is not null as logged from ${db.s}.users where username = 'it_user'`,
    );
    expect(reset.rows[0]).toEqual({ failed_attempts: 0, locked_until: null, logged: true });
  });

  it('sync refuses anonymous, non-JSON and malformed requests', async () => {
    expect((await syncRoute(makeRequest('/api/sync', 'POST', undefined, { device: 'dev-a', cursor: '0', changes: [] }))).status).toBe(401);
    expect((await syncRoute(makeRequest('/api/sync', 'POST', token, {}, 'text/plain'))).status).toBe(415);
    expect((await sync(token, '0', [], 'bad device')).status).toBe(400);
    const tooMany = Array.from({ length: SYNC_LIMITS.maxChanges + 1 }, (_, i) => change('activity', `d${i}`, i, T1));
    expect(await sync(token, '0', tooMany)).toMatchObject({ status: 400, error: SYNC_MSG.tooMany });
  });

  it('first upload stores every change and returns them after the cursor', async () => {
    const r = await sync(token, '0', [change('qstat', 'q1', { a: 1 }, T1), change('cstat', 'c1', { b: 2 }, T1), change('bookmark', 'b1', true, T1)]);
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ accepted: 3, more: false });
    expect(r.data.changes.map((c) => `${c.ns}|${c.key}`).sort()).toEqual(['bookmark|b1', 'cstat|c1', 'qstat|q1']);
    expect(r.data.changes.every((c) => c.device === 'dev-a' && c.updatedAt === T1)).toBe(true);
    expect(BigInt(r.data.cursor) > BigInt(0)).toBe(true);
    cursor = r.data.cursor;
  });

  it('LWW: older and equal clocks are rejected and echo the stored row; a newer clock wins', async () => {
    const stored = { ns: 'qstat', key: 'q1', value: { a: 1 }, updatedAt: T1, device: 'dev-a' };
    const older = await sync(token, cursor, [change('qstat', 'q1', { a: 0 }, T0)], 'dev-b');
    expect(older.data).toEqual({ cursor, more: false, accepted: 0, changes: [stored] });
    const equal = await sync(token, cursor, [change('qstat', 'q1', { a: 9 }, T1)], 'dev-b');
    expect(equal.data).toEqual({ cursor, more: false, accepted: 0, changes: [stored] });
    const newer = await sync(token, cursor, [change('qstat', 'q1', { a: 2 }, T2)], 'dev-b');
    expect(newer.data).toMatchObject({ accepted: 1, more: false });
    expect(newer.data.changes).toEqual([{ ns: 'qstat', key: 'q1', value: { a: 2 }, updatedAt: T2, device: 'dev-b' }]);
    expect(BigInt(newer.data.cursor) > BigInt(cursor)).toBe(true);
    cursor = newer.data.cursor;
  });

  it('tombstones are SQL NULL, duplicate keys collapse to the newest, future clocks are clamped', async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const r = await sync(token, cursor, [
      change('cstat', 'c1', null, T2),
      change('history', 'h1', { v: 1 }, T1),
      change('history', 'h1', { v: 2 }, T2),
      change('settings', 'settings', { x: 1 }, future),
    ]);
    expect(r.data).toMatchObject({ accepted: 3, more: false });
    const byKey = new Map(r.data.changes.map((c) => [`${c.ns}|${c.key}`, c]));
    expect(byKey.get('cstat|c1')).toMatchObject({ value: null, updatedAt: T2 });
    expect(byKey.get('history|h1')).toMatchObject({ value: { v: 2 }, updatedAt: T2 });
    expect(Date.parse(byKey.get('settings|settings')?.updatedAt ?? '')).toBeLessThanOrEqual(Date.now() + 1_000);
    const { rows } = await db.query(`select value is null as gone from ${db.s}.sync_records where ns = 'cstat' and key = 'c1'`);
    expect(rows[0].gone).toBe(true);
    cursor = r.data.cursor;
  });

  it(`pages ${SYNC_LIMITS.pageSize} rows at a time with \`more\``, async () => {
    const bulk = (from: number, n: number): SyncChange[] =>
      Array.from({ length: n }, (_, i) => change('activity', `day-${from + i}`, { n: from + i }, T1));
    expect((await sync(token, cursor, bulk(0, 2000))).data).toMatchObject({ accepted: 2000, more: false });
    expect((await sync(token, cursor, bulk(2000, 1005))).data).toMatchObject({ accepted: 1005, more: true });
    const first = await sync(token, cursor, [], 'dev-c');
    expect(first.data).toMatchObject({ accepted: 0, more: true });
    expect(first.data.changes).toHaveLength(SYNC_LIMITS.pageSize);
    const second = await sync(token, first.data.cursor, [], 'dev-c');
    expect(second.data).toMatchObject({ accepted: 0, more: false });
    expect(second.data.changes).toHaveLength(5);
    expect(new Set([...first.data.changes, ...second.data.changes].map((c) => c.key)).size).toBe(3005);
  });

  it("an account never sees another account's records", async () => {
    const other = await login('other_user', PASS_1);
    expect(other.res.status).toBe(200);
    expect((await sync(other.token, '0', [])).data).toEqual({ cursor: '0', changes: [], more: false, accepted: 0 });
  });

  it('password change checks the current password and revokes every other session', async () => {
    const second = await login('it_user', PASS_2);
    const post = (body: unknown) => passwordRoute(makeRequest('/api/auth/password', 'POST', token, body));
    const wrong = await post({ current: 'not-the-password', next: PASS_3 });
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toEqual({ ok: false, error: AUTH_MSG.wrongCurrent });
    expect(await (await post({ current: PASS_2, next: '12345' })).json()).toEqual({ ok: false, error: AUTH_MSG.weakPassword });
    expect((await post({ current: PASS_2, next: PASS_3 })).status).toBe(200);

    expect(await meStatus(token)).toBe(200);
    expect(await meStatus(second.token)).toBe(401);
    expect(await meStatus(browserToken)).toBe(401);
    expect((await login('it_user', PASS_2)).res.status).toBe(401);
    expect((await login('it_user', PASS_3)).res.status).toBe(200);
  });

  it('logout deletes the session row and clears the cookie', async () => {
    const res = await logoutRoute(makeRequest('/api/auth/logout', 'POST', token));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SESSION_COOKIE)).toMatchObject({ value: '', maxAge: 0 });
    const { rows } = await db.query(`select 1 from ${db.s}.sessions where token_hash = $1`, [sha256(token)]);
    expect(rows).toHaveLength(0);
    expect(await meStatus(token)).toBe(401);
  });
});
