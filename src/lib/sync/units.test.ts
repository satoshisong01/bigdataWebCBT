import { describe, expect, it } from 'vitest';
import { fnv1a, hashValue, NULL_HASH, stableStringify, utf8Length } from './hash';
import { readMeta, resetSyncState, SYNC_META_KEY } from './meta';
import { browserStorage, readJson, removeKey, writeJson } from './store';
import { API_MESSAGES, callApi, GET_INIT, ignoreData, postJson, type FetchFn, type HttpResponse } from './transport';
import { parseMe, parseSyncResponse } from './wire';
import { createMemoryStorage } from './testing/memoryStorage';

const T0 = '2026-10-29T09:00:00.000Z';

function reply(status: number, body?: unknown): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('not json');
      return body;
    },
  };
}

describe('hash', () => {
  it('serializes with sorted keys at every level, otherwise like JSON.stringify', () => {
    expect(stableStringify({ b: 1, a: { d: [3, { f: 1, e: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[3,{"e":2,"f":1}]},"b":1}');
    expect(stableStringify({ a: undefined, b: [undefined, 1] })).toBe('{"b":[null,1]}');
    expect(stableStringify('x')).toBe('"x"');
    expect(stableStringify(undefined)).toBe('null');
    expect(stableStringify(Number.NaN)).toBe('null');
  });

  it('matches the FNV-1a 32-bit reference vectors', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
    expect(fnv1a('foobar')).toBe('bf9cf968');
  });

  it('hashes equal values equally regardless of key order', () => {
    expect(hashValue({ a: 1, b: [1, 2] })).toBe(hashValue({ b: [1, 2], a: 1 }));
    expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }));
    expect(hashValue([1, 2])).not.toBe(hashValue([2, 1]));
    expect(NULL_HASH).toBe(fnv1a('null'));
  });

  it('measures UTF-8 bytes (never under)', () => {
    expect(utf8Length('ab')).toBe(2);
    expect(utf8Length('é')).toBe(2);
    expect(utf8Length('가')).toBe(3);
    expect(utf8Length('😀')).toBeGreaterThanOrEqual(4);
  });
});

describe('meta', () => {
  it('validates field by field and persists a generated device id once', () => {
    const mem = createMemoryStorage({
      [SYNC_META_KEY]: JSON.stringify({
        username: '', userId: 1.5, device: 'bad id!', cursor: '-1', synced: { a: 'h', b: 3 },
        dirty: { a: 'not-a-date', b: T0 }, initialDone: 'yes', lastSyncAt: 5, lastError: '',
      }),
    });
    const ids = ['dev-1', 'dev-2'];
    expect(readMeta(() => mem, () => ids.shift() ?? 'x')).toEqual({
      device: 'dev-1', cursor: '0', synced: { a: 'h' }, dirty: { b: T0 }, initialDone: false,
    });
    expect(readMeta(() => mem, () => 'other').device).toBe('dev-1');
  });

  it('keeps valid fields and survives corrupt JSON or missing storage', () => {
    const good = { username: 'kim', userId: 7, device: 'dev_A-1', cursor: '42', synced: {}, dirty: {}, initialDone: true, lastSyncAt: T0, lastError: '오류' };
    expect(readMeta(() => createMemoryStorage({ [SYNC_META_KEY]: JSON.stringify(good) }), () => 'x')).toEqual(good);
    expect(readMeta(() => createMemoryStorage({ [SYNC_META_KEY]: '{oops' }), () => 'd')).toMatchObject({ device: 'd', cursor: '0' });
    expect(readMeta(() => undefined, () => 'd')).toMatchObject({ device: 'd', initialDone: false });
  });

  it('resets sync progress but keeps the device and last account id', () => {
    const meta = { username: 'kim', userId: 7, device: 'dev', cursor: '42', synced: { a: 'h' }, dirty: { a: T0 }, initialDone: true, lastSyncAt: T0 };
    expect(resetSyncState(meta)).toEqual({ device: 'dev', userId: 7, cursor: '0', synced: {}, dirty: {}, initialDone: false });
  });
});

describe('store', () => {
  it('fails safe on corrupt values, failing writes and missing storage', () => {
    const mem = createMemoryStorage({ bad: '{', ok: '[1]' });
    expect(readJson(() => mem, 'bad')).toBeUndefined();
    expect(readJson(() => mem, 'ok')).toEqual([1]);
    expect(readJson(() => mem, 'missing')).toBeUndefined();
    mem.failKeys.add('x');
    expect(writeJson(() => mem, 'x', 1)).toBe(false);
    expect(writeJson(() => undefined, 'x', 1)).toBe(false);
    expect(writeJson(() => mem, 'y', 1)).toBe(true);
    removeKey(() => mem, 'y');
    expect(mem.getItem('y')).toBeNull();
    removeKey(() => undefined, 'y');
    expect(browserStorage()).toBe(window.localStorage);
  });
});

describe('wire', () => {
  it('rejects malformed sync responses', () => {
    expect(parseSyncResponse(null)).toBeUndefined();
    expect(parseSyncResponse({ cursor: 1, changes: [], more: false })).toBeUndefined();
    expect(parseSyncResponse({ cursor: '1a', changes: [], more: false })).toBeUndefined();
    expect(parseSyncResponse({ cursor: '1', changes: 'x', more: false })).toBeUndefined();
    expect(parseSyncResponse({ cursor: '1', changes: [], more: 'no' })).toBeUndefined();
  });

  it('keeps valid changes only, treating a missing value as a tombstone', () => {
    const data = parseSyncResponse({
      cursor: '9',
      more: false,
      changes: [
        { ns: 'qstat', key: 'q', updatedAt: T0, device: 'd' },
        { ns: 'qstat', key: '', value: 1, updatedAt: T0 },
        { ns: 'qstat', key: 'q', value: 1, updatedAt: 'bad' },
        'junk',
        { ns: 'unknown', key: 'k', value: 1, updatedAt: T0 },
        { ns: 'bookmark', key: 'b', value: true, updatedAt: T0, device: 5 },
      ],
    });
    expect(data).toEqual({
      cursor: '9',
      more: false,
      accepted: 0,
      changes: [
        { ns: 'qstat', key: 'q', value: null, updatedAt: T0, device: 'd' },
        { ns: 'bookmark', key: 'b', value: true, updatedAt: T0, device: '' },
      ],
    });
  });

  it('parses account data, accepting a numeric-string id', () => {
    expect(parseMe({ userId: 3, username: 'kim' })).toEqual({ userId: 3, username: 'kim' });
    expect(parseMe({ userId: '42', username: 'kim' })).toEqual({ userId: 42, username: 'kim' });
    expect(parseMe({ userId: 1.5, username: 'kim' })).toBeUndefined();
    expect(parseMe({ userId: 'x', username: 'kim' })).toBeUndefined();
    expect(parseMe({ userId: 1, username: '' })).toBeUndefined();
    expect(parseMe(null)).toBeUndefined();
  });
});

describe('transport', () => {
  const parseNumber = (d: unknown): number | undefined => (typeof d === 'number' ? d : undefined);
  const call = (fetchFn: FetchFn, unauthorized?: string) => callApi(fetchFn, '/x', GET_INIT, 1000, parseNumber, unauthorized);

  it('maps envelopes and statuses to outcomes with Korean fallbacks', async () => {
    expect(await call(async () => reply(200, { ok: true, data: 5 }))).toEqual({ kind: 'ok', data: 5 });
    expect(await call(async () => reply(200, { ok: true, data: 'x' }))).toEqual({ kind: 'error', error: API_MESSAGES.badResponse, status: 200 });
    expect(await call(async () => reply(401))).toEqual({ kind: 'unauthorized', error: API_MESSAGES.unauthorized });
    expect(await call(async () => reply(401), '맞춤 문구')).toEqual({ kind: 'unauthorized', error: '맞춤 문구' });
    expect(await call(async () => reply(401, { ok: false, error: '서버 문구' }), '맞춤 문구')).toEqual({ kind: 'unauthorized', error: '서버 문구' });
    expect(await call(async () => reply(400, { ok: false, error: '' }))).toEqual({ kind: 'error', error: API_MESSAGES.request, status: 400 });
    expect(await call(async () => reply(502))).toEqual({ kind: 'error', error: API_MESSAGES.server, status: 502 });
    expect(await call(async () => {
      throw new TypeError('Failed to fetch');
    })).toEqual({ kind: 'error', error: API_MESSAGES.network, status: 0 });
  });

  it('aborts a request that takes too long', async () => {
    const hanging: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    expect(await callApi(hanging, '/x', GET_INIT, 10, parseNumber)).toEqual({ kind: 'error', error: API_MESSAGES.network, status: 0 });
  });

  it('builds JSON POSTs that carry cookies and opt into keepalive only when asked', () => {
    expect(postJson({ a: 1 })).toEqual({
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}', credentials: 'same-origin', cache: 'no-store',
    });
    expect(postJson({}, true).keepalive).toBe(true);
    expect(GET_INIT).toEqual({ method: 'GET', credentials: 'same-origin', cache: 'no-store' });
    expect(ignoreData()).toBeNull();
  });
});
