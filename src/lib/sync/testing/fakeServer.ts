/**
 * In-memory stand-in for the auth + sync Route Handlers (tests only), following docs §7.2–§7.3:
 * a cookie jar per client, JSON-only POSTs, last-write-wins upserts (a stored row is replaced only by a
 * strictly newer updatedAt; ties keep it), writer clocks > now+5min clamped to now, one global version
 * sequence with a per-user cursor, pages of `pageSize`, and the current server value of every rejected
 * change echoed after the page (even when the page already holds that row).
 */
import { API_ROUTES, SYNC_LIMITS, isSyncNs, type RemoteChange, type SyncChange, type SyncNs, type SyncRequest } from '../protocol';
import { isRecord } from '../store';
import type { FetchFn, HttpResponse } from '../transport';

const DEVICE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CURSOR_PATTERN = /^\d{1,20}$/;
/** Browsers reject keepalive bodies above 64 KiB. */
const KEEPALIVE_LIMIT = 64 * 1024;

export const FAKE_MESSAGES = {
  loginFailed: '아이디 또는 비밀번호가 올바르지 않습니다',
  needLogin: '로그인이 필요합니다',
  badRequest: '잘못된 요청입니다',
  wrongPassword: '현재 비밀번호가 올바르지 않습니다',
} as const;

interface Row {
  readonly userId: number;
  readonly ns: SyncNs;
  readonly key: string;
  readonly value: unknown;
  /** epoch ms */
  readonly updatedAt: number;
  readonly device: string;
  readonly version: number;
}

interface Account {
  readonly id: number;
  readonly username: string;
  readonly password: string;
}

interface Reply {
  readonly status: number;
  readonly body?: unknown;
}

export interface ServerRecord extends RemoteChange {
  version: number;
}

export interface SentRequest {
  url: string;
  method: string;
  keepalive: boolean;
  body: unknown;
  /** UTF-8 bytes of the raw body */
  bytes: number;
}

export interface FakeClient {
  readonly fetch: FetchFn;
  /** every request of this client, in order */
  readonly requests: SentRequest[];
  /** bodies of its /api/sync requests */
  syncBodies(): SyncRequest[];
}

export interface FakeServer {
  addUser(username: string, password: string): number;
  /** a browser with its own cookie jar */
  client(): FakeClient;
  /** every session stops working, as if expired */
  expireSessions(): void;
  records(userId: number): ServerRecord[];
  record(userId: number, ns: SyncNs, key: string): ServerRecord | undefined;
  /** the next request to `url` gets this reply instead (status 0 = network failure, body undefined = not JSON) */
  failNext(url: string, status: number, body?: unknown): void;
  /** runs right before the next /api/sync request is handled (edits "during" the request) */
  beforeNextSync(hook: () => void): void;
}

export interface FakeServerOptions {
  now: () => number;
  pageSize?: number;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function toResponse({ status, body }: Reply): HttpResponse {
  const payload = clone(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (payload === undefined) throw new SyntaxError('Unexpected token < in JSON');
      return payload;
    },
  };
}

function fail(status: number, error: string): Reply {
  return { status, body: { ok: false, error } };
}

function ok(data: unknown): Reply {
  return { status: 200, body: { ok: true, data } };
}

function contentType(init: RequestInit): string | undefined {
  const headers = init.headers;
  if (!isRecord(headers)) return undefined;
  const value = headers['Content-Type'] ?? headers['content-type'];
  return typeof value === 'string' ? value : undefined;
}

function toChange(v: unknown): SyncChange | undefined {
  if (!isRecord(v)) return undefined;
  const { ns, key, value, updatedAt } = v;
  if (!isSyncNs(ns) || typeof key !== 'string' || key.length < 1 || key.length > SYNC_LIMITS.maxKeyLength) return undefined;
  if (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) return undefined;
  if (value === undefined || byteLength(JSON.stringify(value)) > SYNC_LIMITS.maxValueBytes) return undefined;
  return { ns, key, value, updatedAt };
}

function parseSyncRequest(body: unknown): SyncRequest | undefined {
  if (!isRecord(body)) return undefined;
  const { device, cursor, changes } = body;
  if (typeof device !== 'string' || !DEVICE_PATTERN.test(device)) return undefined;
  if (typeof cursor !== 'string' || !CURSOR_PATTERN.test(cursor)) return undefined;
  if (!Array.isArray(changes) || changes.length > SYNC_LIMITS.maxChanges) return undefined;
  const parsed = changes.map(toChange);
  if (parsed.some(c => c === undefined)) return undefined;
  const valid = parsed as SyncChange[];
  // one bulk upsert cannot touch the same row twice
  if (new Set(valid.map(c => `${c.ns}|${c.key}`)).size !== valid.length) return undefined;
  return { device, cursor, changes: valid };
}

function toRecord(row: Row): ServerRecord {
  return {
    ns: row.ns,
    key: row.key,
    value: clone(row.value),
    updatedAt: new Date(row.updatedAt).toISOString(),
    device: row.device,
    version: row.version,
  };
}

function toRemote(row: Row): RemoteChange {
  const { ns, key, value, updatedAt, device } = toRecord(row);
  return { ns, key, value, updatedAt, device };
}

export function createFakeServer({ now, pageSize = SYNC_LIMITS.pageSize }: FakeServerOptions): FakeServer {
  const accounts = new Map<string, Account>();
  const sessions = new Map<string, number>();
  const rows = new Map<string, Row>();
  const forced = new Map<string, Reply>();
  const hooks: Array<() => void> = [];
  let version = 0;
  let tokenSeq = 0;

  const rowId = (userId: number, ns: SyncNs, key: string): string => `${userId}|${ns}|${key}`;
  const accountOf = (userId: number): Account | undefined => [...accounts.values()].find(a => a.id === userId);

  function login(jar: { token?: string }, body: unknown): Reply {
    if (!isRecord(body) || typeof body.username !== 'string' || typeof body.password !== 'string'
      || typeof body.remember !== 'boolean') {
      return fail(400, FAKE_MESSAGES.badRequest);
    }
    const account = accounts.get(body.username);
    if (!account || account.password !== body.password) return fail(401, FAKE_MESSAGES.loginFailed);
    tokenSeq += 1;
    const token = `token-${tokenSeq}`;
    sessions.set(token, account.id);
    jar.token = token;
    return ok({ userId: account.id, username: account.username });
  }

  function changePassword(jar: { token?: string }, userId: number, body: unknown): Reply {
    const account = accountOf(userId);
    if (!account || !isRecord(body) || typeof body.current !== 'string' || typeof body.next !== 'string') {
      return fail(400, FAKE_MESSAGES.badRequest);
    }
    if (body.current !== account.password) return fail(400, FAKE_MESSAGES.wrongPassword);
    accounts.set(account.username, { ...account, password: body.next });
    [...sessions].filter(([token, id]) => id === userId && token !== jar.token).forEach(([token]) => sessions.delete(token));
    return ok(null);
  }

  function sync(userId: number, body: unknown): Reply {
    hooks.splice(0).forEach(hook => hook());
    const req = parseSyncRequest(body);
    if (!req) return fail(400, FAKE_MESSAGES.badRequest);
    const at = now();
    const rejected: Row[] = [];
    let accepted = 0;
    for (const change of req.changes) {
      const id = rowId(userId, change.ns, change.key);
      const written = Date.parse(change.updatedAt);
      const updatedAt = written > at + SYNC_LIMITS.maxFutureSkewMs ? at : written;
      const existing = rows.get(id);
      if (existing && !(existing.updatedAt < updatedAt)) {
        rejected.push(existing);
        continue;
      }
      version += 1;
      rows.set(id, { userId, ns: change.ns, key: change.key, value: change.value, updatedAt, device: req.device, version });
      accepted += 1;
    }
    const after = Number(req.cursor);
    const newer = [...rows.values()].filter(r => r.userId === userId && r.version > after).sort((a, b) => a.version - b.version);
    const page = newer.slice(0, pageSize);
    const last = page[page.length - 1];
    return ok({
      cursor: last ? String(last.version) : req.cursor,
      changes: [...page, ...rejected].map(toRemote),
      more: newer.length > page.length,
      accepted,
    });
  }

  function route(jar: { token?: string }, url: string, init: RequestInit, body: unknown): Reply {
    const method = init.method ?? 'GET';
    if (method === 'POST' && contentType(init) !== 'application/json') return fail(415, FAKE_MESSAGES.badRequest);
    if (url === API_ROUTES.login && method === 'POST') return login(jar, body);
    if (url === API_ROUTES.logout && method === 'POST') {
      if (jar.token !== undefined) sessions.delete(jar.token);
      jar.token = undefined;
      return ok(null);
    }
    const userId = jar.token === undefined ? undefined : sessions.get(jar.token);
    if (userId === undefined) return fail(401, FAKE_MESSAGES.needLogin);
    if (url === API_ROUTES.me && method === 'GET') return ok({ userId, username: accountOf(userId)?.username });
    if (url === API_ROUTES.password && method === 'POST') return changePassword(jar, userId, body);
    if (url === API_ROUTES.sync && method === 'POST') return sync(userId, body);
    return fail(404, FAKE_MESSAGES.badRequest);
  }

  function client(): FakeClient {
    const jar: { token?: string } = {};
    const requests: SentRequest[] = [];
    const fetchFn: FetchFn = async (url, init) => {
      const raw = typeof init.body === 'string' ? init.body : undefined;
      const body: unknown = raw === undefined ? undefined : JSON.parse(raw);
      const bytes = raw === undefined ? 0 : byteLength(raw);
      requests.push({ url, method: init.method ?? 'GET', keepalive: init.keepalive === true, body, bytes });
      if (init.keepalive === true && bytes > KEEPALIVE_LIMIT) throw new TypeError('keepalive body too large');
      if (bytes > SYNC_LIMITS.maxBodyBytes) return toResponse(fail(413, FAKE_MESSAGES.badRequest));
      const reply = forced.get(url);
      if (reply) {
        forced.delete(url);
        if (reply.status === 0) throw new TypeError('Failed to fetch');
        return toResponse(reply);
      }
      return toResponse(route(jar, url, init, body));
    };
    return {
      fetch: fetchFn,
      requests,
      syncBodies: () => requests.filter(r => r.url === API_ROUTES.sync).map(r => r.body as SyncRequest),
    };
  }

  return {
    addUser: (username, password) => {
      const id = accounts.size + 1;
      accounts.set(username, { id, username, password });
      return id;
    },
    client,
    expireSessions: () => sessions.clear(),
    records: userId =>
      [...rows.values()].filter(r => r.userId === userId).sort((a, b) => a.version - b.version).map(toRecord),
    record: (userId, ns, key) => {
      const row = rows.get(rowId(userId, ns, key));
      return row ? toRecord(row) : undefined;
    },
    failNext: (url, status, body) => {
      forced.set(url, { status, body });
    },
    beforeNextSync: hook => {
      hooks.push(hook);
    },
  };
}
