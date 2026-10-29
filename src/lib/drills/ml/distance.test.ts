import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { distanceGenerator, makeParams, PYTHAGOREAN, solve, type DistanceParams } from './distance';

const pair = (a: number[], b: number[], ask: DistanceParams['ask'] = 'euclid'): DistanceParams => ({ ask, a, b, asSets: false });

describe('distance solve (hand-checked)', () => {
  it('A(1, 2), B(4, 6): L2 5, L1 7, L∞ 4', () => {
    const s = solve(pair([1, 2], [4, 6]));
    expect([s.euclid, s.manhattan, s.chebyshev]).toEqual([5, 7, 4]);
  });

  it('A(1, 2, 3), B(3, 5, 9): L2 7, L1 11, L∞ 6', () => {
    const s = solve(pair([1, 2, 3], [3, 5, 9]));
    expect([s.euclid, s.manhattan, s.chebyshev]).toEqual([7, 11, 6]);
  });

  it('cosine similarity', () => {
    expect(solve(pair([3, 4], [8, 6], 'cosine')).value).toBeCloseTo(0.96); // 48 / 50
    expect(solve(pair([10, 0], [4, 3], 'cosine')).value).toBeCloseTo(0.8); // 40 / 50
    expect(solve(pair([1, 1, 0, 1, 0, 1, 0], [0, 1, 1, 0, 1, 0, 1], 'cosine')).value).toBeCloseTo(0.25); // 1 / (2·2)
  });

  it('jaccard ignores 0-0 matches', () => {
    const s = solve(pair([1, 1, 1, 1, 1, 0, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1, 1, 0, 0], 'jaccard'));
    expect([s.f11, s.f10, s.f01, s.f00]).toEqual([2, 3, 3, 2]);
    expect(s.value).toBeCloseTo(0.25); // 2 / 8
  });

  it('every Pythagorean difference set has an integer length', () => {
    PYTHAGOREAN.forEach(d => expect(Number.isInteger(Math.hypot(...d)), d.join(',')).toBe(true));
  });
});

describe('distance generator', () => {
  it('marks the independently recomputed distance / similarity', () => {
    eachSeed(distanceGenerator, makeParams, (item, p) => {
      const gaps = p.a.map((x, i) => Math.abs(x - p.b[i]));
      const dot = p.a.reduce((acc, x, i) => acc + x * p.b[i], 0);
      const both = p.a.filter((x, i) => x === 1 && p.b[i] === 1).length;
      const either = p.a.filter((x, i) => x === 1 || p.b[i] === 1).length;
      const expected = {
        euclid: Math.hypot(...gaps),
        manhattan: gaps.reduce((a, g) => a + g, 0),
        chebyshev: Math.max(...gaps),
        cosine: dot / (Math.hypot(...p.a) * Math.hypot(...p.b)),
        jaccard: both / either,
      }[p.ask];
      const digits = p.ask === 'cosine' || p.ask === 'jaccard' ? 3 : 2;
      expect(answerText(item)).toBe(formatNum(expected, digits));
      expect(item.options.some(o => o.startsWith('-')), item.options.join(' | ')).toBe(false);
      expect(hasDecimals(expected, digits)).toBe(true);
      if (p.ask === 'euclid') expect(Number.isInteger(expected)).toBe(true);
    });
  });
});
