import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthClient } from '@/lib/auth';
import { API_ROUTES } from './protocol';
import { SYNC_STORAGE_KEYS as K } from './adapters';
import { createSyncEngine, SYNC_ERRORS } from './engine';
import { SYNC_EVENT, SYNC_STATUS_EVENT } from './events';
import { SYNC_META_KEY } from './meta';
import { API_MESSAGES, type FetchFn, type HttpResponse } from './transport';
import { createDevice } from './testing/device';
import { PASSWORD, T0, qstat, seedFull } from './testing/fixtures';
import { createWorld, loggedInDevice } from './testing/world';

function json(body: unknown, status = 200): HttpResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

interface Gate {
  /** holds /api/sync requests of the wrapped fetch until release() */
  wrap(fetchFn: FetchFn): FetchFn;
  /** resolves once a sync request is waiting */
  reached: Promise<void>;
  release(): void;
}

function createGate(): Gate {
  let open: () => void = () => undefined;
  let arrive: () => void = () => undefined;
  const opened = new Promise<void>(resolve => {
    open = resolve;
  });
  const reached = new Promise<void>(resolve => {
    arrive = resolve;
  });
  return {
    wrap: fetchFn => async (url, init) => {
      if (url === API_ROUTES.sync) {
        arrive();
        await opened;
      }
      return fetchFn(url, init);
    },
    reached,
    release: () => open(),
  };
}

describe('failed requests', () => {
  it('keeps the cursor and local changes, reports the Korean error, and recovers', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    a.set(K.bookmark, ['q-1', 'q-9', 'q-77']);

    w.server.failNext(API_ROUTES.sync, 0);
    expect(await a.engine.syncNow()).toEqual({ status: 'error', error: API_MESSAGES.network, applied: 0 });
    expect(a.engine.readMeta()).toMatchObject({ cursor: '14', lastError: API_MESSAGES.network });
    expect(Object.keys(a.engine.readMeta().dirty)).toEqual(['bookmark|q-77']);
    expect(a.engine.getStatus()).toMatchObject({ loggedIn: true, username: 'alice', syncing: false, pending: 1, lastError: API_MESSAGES.network });

    w.server.failNext(API_ROUTES.sync, 503, { ok: false, error: '서버 점검 중입니다' });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'error', error: '서버 점검 중입니다' });
    w.server.failNext(API_ROUTES.sync, 500);
    expect(await a.engine.syncNow()).toMatchObject({ status: 'error', error: API_MESSAGES.server });
    w.server.failNext(API_ROUTES.sync, 200, { ok: true, data: { cursor: 'x', changes: [], more: false } });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'error', error: API_MESSAGES.badResponse });
    w.server.failNext(API_ROUTES.sync, 429, { ok: false, error: '잠시 후 다시 시도해 주세요' });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'error', error: '잠시 후 다시 시도해 주세요' });

    w.clock.set('2026-10-29T10:00:00.000Z');
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 1 });
    expect(a.engine.readMeta().lastError).toBeUndefined();
    expect(a.engine.getStatus().lastSyncAt).toBe('2026-10-29T10:00:00.000Z');
    expect(w.server.record(w.alice, 'bookmark', 'q-77')?.value).toBe(true);
  });

  it('holds the cursor back when local storage cannot be written, then applies the rest', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    const b = createDevice(w.server, w.clock, 'B');
    b.storage.failKeys.add(K.qstat);
    const res = await b.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toEqual({ status: 'error', error: SYNC_ERRORS.storage, applied: 12 });
    expect(b.engine.readMeta()).toMatchObject({ cursor: '0', initialDone: false, lastError: SYNC_ERRORS.storage });
    expect(b.get(K.bookmark)).toEqual(['q-1', 'q-9']);
    expect(b.get(K.qstat)).toBeUndefined();
    expect(b.syncEvents).toEqual([12]);

    b.storage.failKeys.clear();
    expect(await b.engine.syncNow()).toEqual({ status: 'ok', applied: 2, sent: 0, rounds: 1 });
    expect(b.get(K.qstat)).toEqual(a.get(K.qstat));
    expect(b.engine.readMeta()).toMatchObject({ cursor: '14', initialDone: true });
  });

  it('turns an unexpected exception into an error result', async () => {
    const w = createWorld();
    let broken = false;
    const a = createDevice(w.server, w.clock, 'A', () => ({
      now: () => {
        if (broken) throw new Error('clock failure');
        return new Date(w.clock.now());
      },
    }));
    await a.auth.login('alice', PASSWORD, true);
    broken = true;
    expect(await a.engine.syncNow()).toEqual({ status: 'error', error: SYNC_ERRORS.unexpected, applied: 0 });
    expect(a.engine.readMeta().lastError).toBe(SYNC_ERRORS.unexpected);
  });
});

describe('concurrency', () => {
  it('joins a second call to the running sync', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    const before = a.client.syncBodies().length;
    const first = a.engine.syncNow();
    const second = a.engine.syncNow({ keepalive: true });
    expect(second).toBe(first);
    expect(a.engine.getStatus().syncing).toBe(true);
    await first;
    expect(a.client.syncBodies()).toHaveLength(before + 1);
    expect(a.engine.getStatus().syncing).toBe(false);
  });

  it('discards a run whose session ended while its request was in flight', async () => {
    const w = createWorld();
    await loggedInDevice(w); // alice's data is on the server
    const gate = createGate();
    const d = createDevice(w.server, w.clock, 'D', client => ({ fetch: gate.wrap(client.fetch) }));
    const loggingIn = d.auth.login('alice', PASSWORD, true);
    await gate.reached;
    d.engine.endSession('logout');
    gate.release();
    const res = await loggingIn;
    expect(res.ok && res.sync).toEqual({ status: 'skipped', reason: 'logged-out' });
    expect(d.get(K.qstat)).toBeUndefined(); // nothing from the old session was applied
    expect(d.engine.readMeta()).toMatchObject({ cursor: '0', synced: {}, initialDone: false });
    expect(d.engine.readMeta().username).toBeUndefined();
  });

  it('discards a run when another tab logged out meanwhile', async () => {
    const w = createWorld();
    await loggedInDevice(w);
    const gate = createGate();
    const d = createDevice(w.server, w.clock, 'D', client => ({ fetch: gate.wrap(client.fetch) }));
    const loggingIn = d.auth.login('alice', PASSWORD, true);
    await gate.reached;
    const stored = JSON.parse(d.storage.getItem(SYNC_META_KEY) ?? '{}') as Record<string, unknown>;
    d.storage.setItem(SYNC_META_KEY, JSON.stringify({ ...stored, username: undefined }));
    gate.release();
    const res = await loggingIn;
    expect(res.ok && res.sync).toEqual({ status: 'skipped', reason: 'logged-out' });
    expect(d.get(K.qstat)).toBeUndefined();
  });

  it('starts a fresh run after a discarded one when a new session syncs', async () => {
    const w = createWorld();
    await loggedInDevice(w);
    const gate = createGate();
    const d = createDevice(w.server, w.clock, 'D', client => ({ fetch: gate.wrap(client.fetch) }));
    const first = d.auth.login('alice', PASSWORD, true);
    await gate.reached;
    d.engine.beginSession({ userId: w.alice, username: 'alice' }); // same account, new session
    const second = d.engine.syncNow();
    expect(second).not.toBe(first);
    gate.release();
    expect(await second).toMatchObject({ status: 'ok', applied: 14 });
    expect((await first).ok).toBe(true);
  });
});

describe('request limits', () => {
  it('splits keepalive uploads to fit the 64KB keepalive body limit', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    await a.auth.login('alice', PASSWORD, true);
    const big = (day: number) => ({ ...qstat(`2026-10-${day}T09:00:00.000Z`), pad: 'x'.repeat(25_000) });
    a.set(K.qstat, { 'q-1': big(21), 'q-2': big(22), 'q-3': big(23) });
    expect(await a.engine.syncNow({ keepalive: true })).toEqual({ status: 'ok', applied: 0, sent: 3, rounds: 2 });
    const uploads = a.client.requests.filter(r => r.url === API_ROUTES.sync).slice(-2);
    expect(uploads.map(r => r.keepalive)).toEqual([true, true]);
    expect(uploads.every(r => r.bytes < 64 * 1024)).toBe(true);
    expect(w.server.records(w.alice).map(r => r.key)).toEqual(['q-1', 'q-2', 'q-3']);
  });

  it('stops when a pending record cannot fit any keepalive body, leaving it for a normal sync', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    await a.auth.login('alice', PASSWORD, true);
    a.set(K.qstat, { 'q-1': { ...qstat('2026-10-21T09:00:00.000Z'), pad: 'x'.repeat(62_000) } });
    expect(await a.engine.syncNow({ keepalive: true })).toEqual({ status: 'ok', applied: 0, sent: 0, rounds: 1 });
    expect(a.engine.hasPendingChanges()).toBe(true);
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 1 });
    expect(a.engine.hasPendingChanges()).toBe(false);
  });

  it('keeps records the server would refuse on this device only', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    a.set(K.qstat, {
      ['q'.repeat(161)]: qstat('2026-10-21T09:00:00.000Z'),
      'q-big': { ...qstat('2026-10-21T09:00:00.000Z'), pad: 'x'.repeat(70_000) },
      'q-ok': qstat('2026-10-21T09:00:00.000Z'),
    });
    const res = await a.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toEqual({ status: 'ok', applied: 0, sent: 1, rounds: 1 });
    expect(w.server.records(w.alice).map(r => r.key)).toEqual(['q-ok']);
    expect(a.engine.hasPendingChanges()).toBe(false);
    expect(Object.keys(a.get(K.qstat) as object)).toHaveLength(3);
  });

  it('stops after 20 rounds even if the server always reports more', async () => {
    const w = createWorld();
    let page = 0;
    const d = createDevice(w.server, w.clock, 'D', client => ({
      fetch: async (url, init) => {
        if (url !== API_ROUTES.sync) return client.fetch(url, init);
        page += 1;
        const change = { ns: 'bookmark', key: `q-${page}`, value: true, updatedAt: T0, device: 'other' };
        return json({ ok: true, data: { cursor: String(page), changes: [change], more: true, accepted: 0 } });
      },
    }));
    const res = await d.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toEqual({ status: 'ok', applied: 20, sent: 0, rounds: 20 });
    expect(d.engine.readMeta()).toMatchObject({ cursor: '20', initialDone: false });
    expect(d.get(K.bookmark)).toHaveLength(20);
  });

  it('stops when the server reports more but sends an empty page, and ignores unknown namespaces', async () => {
    const w = createWorld();
    const replies = [
      { cursor: '3', changes: [{ ns: 'future-ns', key: 'k', value: 1, updatedAt: T0, device: 'x' }], more: true, accepted: 0 },
      { cursor: '3', changes: [], more: true, accepted: 0 },
    ];
    const d = createDevice(w.server, w.clock, 'D', client => ({
      fetch: async (url, init) =>
        url === API_ROUTES.sync ? json({ ok: true, data: replies.shift() }) : client.fetch(url, init),
    }));
    const res = await d.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toEqual({ status: 'ok', applied: 0, sent: 0, rounds: 2 });
    expect(d.engine.readMeta()).toMatchObject({ cursor: '3', initialDone: false });
  });
});

describe('events and status', () => {
  it('reports status changes and only fires SYNC_EVENT when something was applied', async () => {
    const w = createWorld();
    await loggedInDevice(w);
    const b = createDevice(w.server, w.clock, 'B');
    expect(b.engine.getStatus()).toEqual({ loggedIn: false, syncing: false, pending: 0 });
    await b.auth.login('alice', PASSWORD, true);
    expect(b.events).toEqual([SYNC_STATUS_EVENT, SYNC_STATUS_EVENT, SYNC_EVENT, SYNC_STATUS_EVENT]);
    expect(b.syncEvents).toEqual([14]);
    await b.engine.syncNow();
    expect(b.syncEvents).toEqual([14]);
  });
});

describe('browser defaults', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('uses window.localStorage, global fetch, window events and a random device id', async () => {
    const w = createWorld();
    seedFull({ set: (key, value) => localStorage.setItem(key, JSON.stringify(value)) });
    const client = w.server.client();
    vi.stubGlobal('fetch', client.fetch);
    const engine = createSyncEngine();
    const heard: number[] = [];
    const onSynced = (e: Event) => heard.push((e as CustomEvent<{ applied: number }>).detail.applied);
    window.addEventListener(SYNC_EVENT, onSynced);
    const res = await createAuthClient(engine).login('alice', PASSWORD, true);
    window.removeEventListener(SYNC_EVENT, onSynced);
    expect(res.ok && res.sync).toMatchObject({ status: 'ok', sent: 14 });
    const meta = JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? '{}') as { device?: string; username?: string };
    expect(meta.username).toBe('alice');
    expect(meta.device).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(heard).toEqual([]);
    expect(w.server.records(w.alice)).toHaveLength(14);
  });

  it('skips when another tab holds the Web Lock and falls back when locks fail', async () => {
    const w = createWorld();
    vi.stubGlobal('fetch', w.server.client().fetch);
    const request = vi.fn((_name: string, _options: unknown, callback: (lock: unknown) => unknown) =>
      Promise.resolve(callback(null)),
    );
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    const engine = createSyncEngine();
    await createAuthClient(engine).login('alice', PASSWORD, true);
    expect(await engine.syncNow()).toEqual({ status: 'skipped', reason: 'busy' });
    expect(request).toHaveBeenCalledWith('bigdata-cbt-sync', { ifAvailable: true }, expect.any(Function));

    request.mockImplementation((_name, _options, callback) => Promise.resolve(callback({ name: 'bigdata-cbt-sync' })));
    expect(await engine.syncNow()).toMatchObject({ status: 'ok' });

    request.mockImplementation(() => Promise.reject(new DOMException('denied', 'SecurityError')));
    expect(await engine.syncNow()).toMatchObject({ status: 'ok' });
  });
});
