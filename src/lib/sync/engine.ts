/**
 * Local-first sync engine (docs §7.5). localStorage stays what the app reads; while logged in, the
 * records of SYNC_NAMESPACES are reconciled with the server one by one (last write wins).
 *
 * App use: startAutoSync() once in the shell (SyncProvider), syncNow() for "지금 동기화",
 * getSyncStatus() for header/settings, and the SYNC_EVENT window event to re-read storage.
 * Tests build isolated engines with createSyncEngine({ fetch, now, storage, … }).
 */
import { API_ROUTES, SYNC_LIMITS, type MeData, type SyncNs, type SyncRequest } from './protocol';
import { createAdapters, type SyncAdapter } from './adapters';
import { startAutoSyncLoop } from './autoSync';
import {
  SYNC_EVENT, SYNC_STATUS_EVENT, type SyncEventDetail, type SyncOptions, type SyncResult, type SyncStatus,
} from './events';
import { hashValue } from './hash';
import { mergeResponse } from './merge';
import { readMeta, resetSyncState, writeMeta, type SyncMeta } from './meta';
import { baselineOf, fullKey, scan, takeBatch, wasAttempted, type ScanResult } from './scan';
import { browserStorage, removeKey, type StorageGetter } from './store';
import { API_MESSAGES, callApi, postJson, type ApiOutcome, type FetchFn } from './transport';
import { parseSyncResponse } from './wire';

export { SYNC_EVENT, SYNC_STATUS_EVENT } from './events';
export type { SyncEventDetail, SyncOptions, SyncResult, SyncSkipReason, SyncStatus } from './events';

export interface SyncDeps {
  fetch: FetchFn;
  now: () => Date;
  isOnline: () => boolean;
  storage: StorageGetter;
  newDeviceId: () => string;
  /** window event dispatch (SYNC_EVENT / SYNC_STATUS_EVENT) */
  dispatch: (type: string, detail?: unknown) => void;
  /** cross-tab exclusion; resolves undefined when another tab is already syncing */
  runExclusive: <T>(task: () => Promise<T>) => Promise<T | undefined>;
  requestTimeoutMs: number;
}

export interface SyncEngine {
  /** One run at a time: a call during a run joins it. Never rejects. */
  syncNow(options?: SyncOptions): Promise<SyncResult>;
  /** start / visible / hidden / online / every 45s while dirty, with backoff; returns the cleanup */
  startAutoSync(): () => void;
  getStatus(): SyncStatus;
  /** Rescans local data; true when changes wait for upload (always false when logged out). */
  hasPendingChanges(): boolean;
  /**
   * Changes of the last account (logged in, or its session expired) that never reached the server.
   * 0 without an account and after an explicit logout (which already reset the sync progress).
   */
  unsyncedCount(): number;
  readMeta(): SyncMeta;
  /** After a successful login: a different account first clears this device's study data. */
  beginSession(me: MeData): void;
  /** logout: reset sync progress (study data stays) · expired: only mark logged out */
  endSession(kind: 'logout' | 'expired', error?: string): void;
  request<T>(
    url: string, init: RequestInit, parse: (data: unknown) => T | undefined, unauthorizedMessage?: string,
  ): Promise<ApiOutcome<T>>;
}

const MAX_ROUNDS = 20;
/** Slack under SYNC_LIMITS.maxBodyBytes for the size estimate. */
const BODY_BUDGET = SYNC_LIMITS.maxBodyBytes - 50_000;
/** Browsers reject keepalive request bodies over 64 KiB. */
const KEEPALIVE_BUDGET = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const LOCK_NAME = 'bigdata-cbt-sync';

export const SYNC_ERRORS = {
  storage: '기기 저장 공간에 기록하지 못해 동기화를 멈췄습니다. 저장 공간을 확인해 주세요.',
  unexpected: '동기화 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
} as const;

const SKIPPED_LOGGED_OUT: SyncResult = { status: 'skipped', reason: 'logged-out' };
const SKIPPED_OFFLINE: SyncResult = { status: 'skipped', reason: 'offline' };
const SKIPPED_BUSY: SyncResult = { status: 'skipped', reason: 'busy' };

interface RunState {
  /** set by a hidden-page call that joined the run */
  keepalive: boolean;
}

interface RunContext {
  readonly gen: number;
  /** meta when the run started: identifies the session */
  readonly start: SyncMeta;
  readonly state: RunState;
  meta: SyncMeta;
  applied: number;
  sent: number;
  rounds: number;
}

interface Running {
  readonly generation: number;
  readonly state: RunState;
  readonly promise: Promise<SyncResult>;
}

function sameEntries(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k]);
}

export function createSyncEngine(overrides: Partial<SyncDeps> = {}): SyncEngine {
  const deps: SyncDeps = { ...defaultDeps(), ...overrides };
  const adapters = createAdapters(deps.storage);
  const byNs = new Map<SyncNs, SyncAdapter>(adapters.map(a => [a.ns, a]));
  /** bumped by every login/logout/expiry: runs of an older session discard their results */
  let generation = 0;
  let seen = new Map<string, string>();
  let running: Running | undefined;

  const load = (): SyncMeta => readMeta(deps.storage, deps.newDeviceId);
  const save = (meta: SyncMeta): void => {
    writeMeta(deps.storage, meta);
  };
  const nowIso = (): string => deps.now().toISOString();
  const statusChanged = (): void => deps.dispatch(SYNC_STATUS_EVENT);

  const rescan = (meta: SyncMeta): ScanResult => {
    const result = scan({ adapters, meta, seen, now: nowIso() });
    seen = result.seen;
    return result;
  };

  /** Still the session the run started in — no logout or account switch here or in another tab. */
  const isCurrent = (ctx: RunContext): boolean => {
    const stored = load();
    return ctx.gen === generation && stored.username === ctx.start.username && stored.userId === ctx.start.userId;
  };

  const fail = (ctx: RunContext, error: string): SyncResult => {
    save({ ...ctx.meta, lastError: error });
    return { status: 'error', error, applied: ctx.applied };
  };

  function endSession(kind: 'logout' | 'expired', error?: string): void {
    const meta = load();
    generation += 1;
    if (kind === 'logout') {
      seen = new Map();
      save(resetSyncState(meta));
    } else {
      save({ ...meta, username: undefined, lastError: error ?? API_MESSAGES.unauthorized });
    }
    statusChanged();
  }

  async function rounds(ctx: RunContext): Promise<SyncResult> {
    const attempts = new Map<string, string>();
    let complete = false;
    while (!complete && ctx.rounds < MAX_ROUNDS) {
      ctx.rounds += 1;
      const before = rescan(ctx.meta);
      ctx.meta = before.meta;
      save(ctx.meta);
      const keepalive = ctx.state.keepalive;
      const offered = Object.keys(ctx.meta.dirty).some(full => !wasAttempted(attempts, before.local, full));
      const changes = takeBatch(ctx.meta, before.local, attempts, keepalive ? KEEPALIVE_BUDGET : BODY_BUDGET);
      const body: SyncRequest = { device: ctx.meta.device, cursor: ctx.meta.cursor, changes };
      const outcome = await callApi(
        deps.fetch, API_ROUTES.sync, postJson(body, keepalive), deps.requestTimeoutMs, parseSyncResponse,
      );
      if (!isCurrent(ctx)) return SKIPPED_LOGGED_OUT;
      if (outcome.kind === 'unauthorized') {
        endSession('expired', outcome.error);
        return { status: 'unauthorized', error: outcome.error };
      }
      if (outcome.kind === 'error') return fail(ctx, outcome.error);

      const after = rescan(ctx.meta);
      const merged = mergeResponse({ adapters: byNs, meta: after.meta, local: after.local, sent: changes, response: outcome.data });
      ctx.applied += merged.applied;
      ctx.sent += changes.length;
      if (merged.failed) {
        ctx.meta = merged.meta; // cursor stays: the unwritten records come again next time
        return fail(ctx, SYNC_ERRORS.storage);
      }
      ctx.meta = { ...merged.meta, cursor: outcome.data.cursor };
      save(ctx.meta);
      changes.forEach(c => attempts.set(fullKey(c.ns, c.key), hashValue(c.value)));
      const waiting = Object.keys(ctx.meta.dirty).some(full => !wasAttempted(attempts, after.local, full));
      complete = !outcome.data.more && !waiting;
      const nothingFits = offered && changes.length === 0; // e.g. a record larger than a keepalive body
      const stalled = outcome.data.more && changes.length === 0 && outcome.data.cursor === body.cursor;
      if (nothingFits || stalled) break; // no progress possible now: the rest waits for a later sync
    }
    const initialDone = ctx.meta.initialDone || complete;
    const baseline = initialDone ? undefined : ctx.meta.baseline;
    ctx.meta = { ...ctx.meta, initialDone, baseline, lastSyncAt: nowIso(), lastError: undefined };
    save(ctx.meta);
    return { status: 'ok', applied: ctx.applied, sent: ctx.sent, rounds: ctx.rounds };
  }

  async function run(gen: number, state: RunState): Promise<SyncResult> {
    const start = load();
    if (gen !== generation || start.username === undefined) return SKIPPED_LOGGED_OUT;
    if (!deps.isOnline()) return SKIPPED_OFFLINE;
    const ctx: RunContext = { gen, start, state, meta: start, applied: 0, sent: 0, rounds: 0 };
    statusChanged();
    try {
      return await rounds(ctx);
    } catch {
      return fail(ctx, SYNC_ERRORS.unexpected);
    } finally {
      if (ctx.applied > 0) deps.dispatch(SYNC_EVENT, { applied: ctx.applied } satisfies SyncEventDetail);
      statusChanged();
    }
  }

  function syncNow(options: SyncOptions = {}): Promise<SyncResult> {
    if (running && running.generation === generation) {
      if (options.keepalive) running.state.keepalive = true;
      return running.promise;
    }
    const gen = generation;
    const state: RunState = { keepalive: options.keepalive === true };
    const previous = running?.promise; // a run of an older session: let it finish discarding first
    const promise = (async (): Promise<SyncResult> => {
      await previous; // also defers the run until `running` is set, so status listeners see syncing
      return (await deps.runExclusive(() => run(gen, state))) ?? SKIPPED_BUSY;
    })();
    const entry: Running = { generation: gen, state, promise };
    running = entry;
    void promise.finally(() => {
      if (running === entry) running = undefined;
    });
    return promise;
  }

  function dirtyCount(meta: SyncMeta): number {
    if (running) return Object.keys(meta.dirty).length; // the run rescans on its own
    const next = rescan(meta).meta;
    if (!sameEntries(meta.dirty, next.dirty)) save(next);
    return Object.keys(next.dirty).length;
  }

  function hasPendingChanges(): boolean {
    const meta = load();
    return meta.username !== undefined && dirtyCount(meta) > 0;
  }

  function unsyncedCount(): number {
    const meta = load();
    const hasProgress = meta.initialDone || Object.keys(meta.synced).length > 0;
    return meta.userId === undefined || !hasProgress ? 0 : dirtyCount(meta);
  }

  function beginSession(me: MeData): void {
    const meta = load();
    const sameAccount = meta.userId === me.userId;
    if (meta.userId !== undefined && !sameAccount) {
      adapters.forEach(a => a.storageKeys.forEach(key => removeKey(deps.storage, key)));
    }
    generation += 1;
    if (!sameAccount) seen = new Map();
    const base = sameAccount ? meta : resetSyncState(meta);
    // records present now (after a switch: none) are the ones the EPOCH clock may fill in with
    const baseline = base.initialDone ? undefined : base.baseline ?? baselineOf(adapters);
    save({ ...base, baseline, username: me.username, userId: me.userId, lastError: undefined });
    statusChanged();
  }

  function getStatus(): SyncStatus {
    const meta = load();
    return {
      loggedIn: meta.username !== undefined,
      username: meta.username,
      syncing: running !== undefined,
      pending: Object.keys(meta.dirty).length,
      lastSyncAt: meta.lastSyncAt,
      lastError: meta.lastError,
    };
  }

  return {
    syncNow,
    startAutoSync: () =>
      startAutoSyncLoop({
        syncNow,
        hasPendingChanges,
        isLoggedIn: () => load().username !== undefined,
        now: () => deps.now().getTime(),
      }),
    getStatus,
    hasPendingChanges,
    unsyncedCount,
    readMeta: load,
    beginSession,
    endSession,
    request: (url, init, parse, unauthorizedMessage) =>
      callApi(deps.fetch, url, init, deps.requestTimeoutMs, parse, unauthorizedMessage),
  };
}

// ---------- browser defaults ----------

function randomDeviceId(): string {
  const c = typeof crypto === 'undefined' ? undefined : crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    return Array.from(c.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  }
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function dispatchWindowEvent(type: string, detail?: unknown): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

/** Web Locks keep two tabs from syncing the same localStorage at once; without them, run directly. */
async function withTabLock<T>(task: () => Promise<T>): Promise<T | undefined> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks || typeof locks.request !== 'function') return task();
  const granted = { value: false };
  try {
    return await locks.request(LOCK_NAME, { ifAvailable: true }, lock => {
      if (!lock) return undefined;
      granted.value = true;
      return task();
    });
  } catch (error) {
    if (granted.value) throw error;
    return task(); // lock manager unusable here (e.g. sandboxed frame)
  }
}

function defaultDeps(): SyncDeps {
  return {
    fetch: (url, init) => fetch(url, init),
    now: () => new Date(),
    isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    storage: browserStorage,
    newDeviceId: randomDeviceId,
    dispatch: dispatchWindowEvent,
    runExclusive: withTabLock,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  };
}

// ---------- shared app instance ----------

let shared: SyncEngine | undefined;

export function getSyncEngine(): SyncEngine {
  shared ??= createSyncEngine();
  return shared;
}

export function syncNow(options?: SyncOptions): Promise<SyncResult> {
  return getSyncEngine().syncNow(options);
}

export function startAutoSync(): () => void {
  return getSyncEngine().startAutoSync();
}

export function getSyncStatus(): SyncStatus {
  return getSyncEngine().getStatus();
}
