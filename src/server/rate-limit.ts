/**
 * Server-only: in-memory fixed-window rate limits per key (client IP), docs §7.1.
 * State is per server instance — a coarse guard in front of the DB-backed login lockout.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** seconds until the window resets; 0 when allowed */
  retryAfterSec: number;
}

export interface RateLimiter {
  hit(key: string, nowMs?: number): RateLimitDecision;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** bound on tracked keys (spoofed or many distinct IPs) */
  maxKeys?: number;
}

interface Window {
  start: number;
  count: number;
}

const MINUTE_MS = 60_000;

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: RateLimitOptions): RateLimiter {
  const windows = new Map<string, Window>();

  function evict(nowMs: number): void {
    for (const [key, w] of windows) {
      if (nowMs - w.start >= windowMs) windows.delete(key);
    }
    // Map iterates in insertion order and a fresh window is re-inserted, so this drops the oldest
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break;
      windows.delete(key);
    }
  }

  function decide(w: Window, nowMs: number): RateLimitDecision {
    const allowed = w.count <= limit;
    const retryAfterSec = allowed ? 0 : Math.max(1, Math.ceil((w.start + windowMs - nowMs) / 1000));
    return { allowed, retryAfterSec };
  }

  return {
    hit(key: string, nowMs: number = Date.now()): RateLimitDecision {
      const current = windows.get(key);
      if (current && nowMs - current.start < windowMs) {
        const next = { start: current.start, count: current.count + 1 };
        windows.set(key, next);
        return decide(next, nowMs);
      }
      windows.delete(key);
      if (windows.size >= maxKeys) evict(nowMs);
      const fresh = { start: nowMs, count: 1 };
      windows.set(key, fresh);
      return decide(fresh, nowMs);
    },
  };
}

/** login and password change */
export const authLimiter: RateLimiter = createRateLimiter({ limit: 20, windowMs: MINUTE_MS });
/** POST /api/sync */
export const syncLimiter: RateLimiter = createRateLimiter({ limit: 60, windowMs: MINUTE_MS });
/** me / logout — cheap session lookups, kept off the login budget */
export const sessionLimiter: RateLimiter = createRateLimiter({ limit: 60, windowMs: MINUTE_MS });
