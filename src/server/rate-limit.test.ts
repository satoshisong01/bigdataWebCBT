// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter (fixed window)', () => {
  it('allows `limit` hits per window, then answers with Retry-After seconds', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect([0, 1, 2].map((t) => limiter.hit('ip', t).allowed)).toEqual([true, true, true]);
    expect(limiter.hit('ip', 15_000)).toEqual({ allowed: false, retryAfterSec: 45 });
    expect(limiter.hit('ip', 59_999)).toEqual({ allowed: false, retryAfterSec: 1 });
  });

  it('starts a fresh window once the old one has passed', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.hit('ip', 0).allowed).toBe(true);
    expect(limiter.hit('ip', 999).allowed).toBe(false);
    expect(limiter.hit('ip', 1_000)).toEqual({ allowed: true, retryAfterSec: 0 });
  });

  it('counts keys independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.hit('a', 0).allowed).toBe(true);
    expect(limiter.hit('b', 0).allowed).toBe(true);
    expect(limiter.hit('a', 1).allowed).toBe(false);
  });

  it('bounds memory: expired windows go first, then the oldest live ones', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 2 });
    limiter.hit('a', 0);
    limiter.hit('b', 500);
    limiter.hit('c', 1_200); // 'a' expired → evicted; 'b' (live) is kept
    expect(limiter.hit('b', 1_300).allowed).toBe(false);
    limiter.hit('d', 1_400); // all live → the oldest ('b') is dropped
    expect(limiter.hit('b', 1_450).allowed).toBe(true);
  });
});
