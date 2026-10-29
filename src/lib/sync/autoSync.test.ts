import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ROUTES } from './protocol';
import { SYNC_STORAGE_KEYS as K } from './adapters';
import { RETRY_MAX_MS, retryDelay, startAutoSyncLoop, type AutoSyncTarget } from './autoSync';
import type { SyncOptions, SyncResult } from './events';
import { createFakeServer } from './testing/fakeServer';
import { createClock, createDevice } from './testing/device';
import { PASSWORD, T0 } from './testing/fixtures';

const OK: SyncResult = { status: 'ok', applied: 0, sent: 0, rounds: 1 };
const FAILED: SyncResult = { status: 'error', error: '서버에 연결하지 못했습니다.', applied: 0 };

interface Stub {
  target: AutoSyncTarget;
  calls: Array<SyncOptions | undefined>;
  /** queued results; OK once empty */
  results: SyncResult[];
  state: { loggedIn: boolean; pending: boolean };
}

function stub(): Stub {
  const calls: Array<SyncOptions | undefined> = [];
  const results: SyncResult[] = [];
  const state = { loggedIn: true, pending: false };
  return {
    calls,
    results,
    state,
    target: {
      syncNow: async options => {
        calls.push(options);
        return results.shift() ?? OK;
      },
      hasPendingChanges: () => state.pending,
      isLoggedIn: () => state.loggedIn,
      now: () => Date.now(),
    },
  };
}

let visibility: DocumentVisibilityState = 'visible';

function setVisibility(next: DocumentVisibilityState): void {
  visibility = next;
  document.dispatchEvent(new Event('visibilitychange'));
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
});

afterEach(() => {
  vi.useRealTimers();
  visibility = 'visible';
});

describe('startAutoSyncLoop', () => {
  it('syncs on start only when logged in', async () => {
    const out = stub();
    out.state.loggedIn = false;
    const stopOut = startAutoSyncLoop(out.target);
    await flush();
    expect(out.calls).toEqual([]);
    stopOut();

    const s = stub();
    const stop = startAutoSyncLoop(s.target);
    await flush();
    expect(s.calls).toEqual([{}]);
    stop();
  });

  it('syncs when the tab becomes visible; on hide only with pending changes, using keepalive', async () => {
    const s = stub();
    const stop = startAutoSyncLoop(s.target);
    await flush();
    setVisibility('hidden');
    await flush();
    expect(s.calls).toEqual([{}]);
    s.state.pending = true;
    setVisibility('hidden');
    await flush();
    setVisibility('visible');
    await flush();
    expect(s.calls).toEqual([{}, { keepalive: true }, {}]);
    stop();
  });

  it('syncs when the browser comes back online, unless logged out', async () => {
    const s = stub();
    const stop = startAutoSyncLoop(s.target);
    await flush();
    window.dispatchEvent(new Event('online'));
    await flush();
    s.state.loggedIn = false;
    window.dispatchEvent(new Event('online'));
    setVisibility('visible');
    await flush();
    expect(s.calls).toEqual([{}, {}]);
    stop();
  });

  it('syncs every 45s only while changes are pending', async () => {
    const s = stub();
    const stop = startAutoSyncLoop(s.target);
    await flush();
    await vi.advanceTimersByTimeAsync(45_000);
    expect(s.calls).toHaveLength(1);
    s.state.pending = true;
    await vi.advanceTimersByTimeAsync(45_000);
    expect(s.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(s.calls).toHaveLength(3);
    stop();
  });

  it('retries failures with exponential backoff and pauses the 45s timer meanwhile', async () => {
    const s = stub();
    s.results.push(FAILED, FAILED, FAILED, FAILED);
    s.state.pending = true;
    const stop = startAutoSyncLoop(s.target);
    await flush(); // t=0 start fails → retry in 5s
    expect(s.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(s.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1); // t=5s fails → 10s
    expect(s.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(10_000); // t=15s fails → 20s
    expect(s.calls).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(20_000); // t=35s fails → 40s (t=75s)
    expect(s.calls).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(10_000); // t=45s: the 45s tick falls inside the backoff window
    expect(s.calls).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(30_000); // t=75s retry succeeds → backoff cleared
    expect(s.calls).toHaveLength(5);
    await vi.advanceTimersByTimeAsync(15_000); // t=90s tick with pending changes
    expect(s.calls).toHaveLength(6);
    stop();
  });

  it('does not retry skipped or unauthorized results', async () => {
    const s = stub();
    s.results.push({ status: 'skipped', reason: 'offline' }, { status: 'unauthorized', error: '로그인이 필요합니다' });
    const stop = startAutoSyncLoop(s.target);
    await flush();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(s.calls).toHaveLength(2);
    stop();
  });

  it('removes every listener and timer on cleanup, including a pending retry', async () => {
    const s = stub();
    s.results.push(FAILED);
    s.state.pending = true;
    const stop = startAutoSyncLoop(s.target);
    await flush();
    stop();
    setVisibility('visible');
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(s.calls).toHaveLength(1);
  });

  it('ignores a result that arrives after cleanup', async () => {
    const s = stub();
    let finish: (r: SyncResult) => void = () => undefined;
    s.target.syncNow = () => new Promise(resolve => {
      finish = resolve;
    });
    const stop = startAutoSyncLoop(s.target);
    stop();
    finish(FAILED);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('retryDelay', () => {
  it('doubles from 5s and caps at 5 minutes', () => {
    expect([0, 1, 2, 3, 4].map(retryDelay)).toEqual([5_000, 5_000, 10_000, 20_000, 40_000]);
    expect(retryDelay(7)).toBe(RETRY_MAX_MS);
    expect(retryDelay(50)).toBe(RETRY_MAX_MS);
  });
});

describe('engine.startAutoSync', () => {
  it('syncs on start and flushes local changes with keepalive when the page is hidden', async () => {
    const clock = createClock(T0);
    const server = createFakeServer({ now: clock.now });
    const alice = server.addUser('alice', PASSWORD);
    const a = createDevice(server, clock, 'A');
    await a.auth.login('alice', PASSWORD, true);
    const syncs = () => a.client.requests.filter(r => r.url === API_ROUTES.sync);
    const stop = a.engine.startAutoSync();
    await flush();
    expect(syncs()).toHaveLength(2); // login + app start

    a.set(K.bookmark, ['q-1']);
    setVisibility('hidden');
    await flush();
    expect(syncs()).toHaveLength(3);
    expect(syncs()[2].keepalive).toBe(true);
    expect(server.record(alice, 'bookmark', 'q-1')?.value).toBe(true);

    a.set(K.bookmark, ['q-1', 'q-2']);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(syncs()).toHaveLength(4);
    expect(server.record(alice, 'bookmark', 'q-2')?.value).toBe(true);
    stop();
  });
});
