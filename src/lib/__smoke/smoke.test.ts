import { describe, it, expect } from 'vitest';
import { addDays, diffDays } from '@/lib/date';
import { seededRandom, shuffleWith } from '@/lib/rng';

describe('test setup', () => {
  it('resolves @ alias and runs in jsdom', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-29', '2027-04-03')).toBe(156);
    expect(typeof localStorage.setItem).toBe('function');
    const a = shuffleWith([1, 2, 3, 4, 5], seededRandom(7));
    const b = shuffleWith([1, 2, 3, 4, 5], seededRandom(7));
    expect(a).toEqual(b);
  });
});
