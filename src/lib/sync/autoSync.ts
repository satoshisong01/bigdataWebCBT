/**
 * Automatic sync triggers (docs §7.5): app start, tab visible, tab hidden (keepalive, only with local
 * changes), back online, and every 45s while local changes wait. Failed automatic syncs retry with
 * exponential backoff; the 45s timer pauses during a backoff window.
 */
import type { SyncOptions, SyncResult } from './events';

export interface AutoSyncTarget {
  syncNow(options?: SyncOptions): Promise<SyncResult>;
  /** rescans local data: true when changes wait for upload */
  hasPendingChanges(): boolean;
  isLoggedIn(): boolean;
  /** epoch ms */
  now(): number;
}

export const AUTO_SYNC_INTERVAL_MS = 45_000;
export const RETRY_BASE_MS = 5_000;
export const RETRY_MAX_MS = 5 * 60_000;

/** 5s, 10s, 20s, … capped at 5 minutes. */
export function retryDelay(failures: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, failures - 1), RETRY_MAX_MS);
}

/** Starts the triggers; the returned cleanup removes every listener and timer. */
export function startAutoSyncLoop(target: AutoSyncTarget): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  let stopped = false;
  let failures = 0;
  let blockedUntil = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const clearRetry = (): void => {
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    retryTimer = undefined;
  };

  const onResult = (result: SyncResult): void => {
    if (stopped) return;
    if (result.status === 'ok') {
      failures = 0;
      blockedUntil = 0;
      clearRetry();
      return;
    }
    if (result.status !== 'error') return; // skipped / logged out: nothing to retry
    failures += 1;
    const delay = retryDelay(failures);
    blockedUntil = target.now() + delay;
    clearRetry();
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      trigger({});
    }, delay);
  };

  const trigger = (options: SyncOptions): void => {
    if (stopped || !target.isLoggedIn()) return;
    void target.syncNow(options).then(onResult);
  };

  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') trigger({});
    else if (target.isLoggedIn() && target.hasPendingChanges()) trigger({ keepalive: true });
  };
  const onOnline = (): void => trigger({});
  const onTick = (): void => {
    if (target.isLoggedIn() && target.now() >= blockedUntil && target.hasPendingChanges()) trigger({});
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  const interval = setInterval(onTick, AUTO_SYNC_INTERVAL_MS);
  trigger({});

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
    clearRetry();
  };
}
