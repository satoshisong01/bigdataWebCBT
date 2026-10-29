import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { ENTROPY_BASES, entropy, entropyGiniGenerator, gini, makeParams, solve, SPLITS } from './entropyGini';

describe('entropy-gini solve (hand-checked)', () => {
  it('entropies of dyadic nodes', () => {
    expect(entropy([4, 4])).toBeCloseTo(1);
    expect(entropy([4, 2, 2])).toBeCloseTo(1.5);
    expect(entropy([2, 2, 2, 2])).toBeCloseTo(2);
    expect(entropy([4, 2, 1, 1])).toBeCloseTo(1.75);
    expect(entropy([8, 4, 2, 1, 1])).toBeCloseTo(1.875);
    expect(entropy([8, 0])).toBe(0);
  });

  it('gini impurities', () => {
    expect(gini([6, 4])).toBeCloseTo(0.48);
    expect(gini([1, 3])).toBeCloseTo(0.375);
    expect(gini([5, 3, 2])).toBeCloseTo(0.62);
    expect(gini([1, 1, 1, 1])).toBeCloseTo(0.75);
  });

  it('information gain of (4,2,2) → (4,0,0) | (0,2,2) is 1', () => {
    const s = solve({ ask: 'ig', left: [4, 0, 0], right: [0, 2, 2] });
    expect(s.entropy).toBeCloseTo(1.5);
    expect(s.weighted).toBeCloseTo(0.5);
    expect(s.value).toBeCloseTo(1);
  });

  it('information gain of (4,2,1,1) → (2,1,1,0) | (2,1,0,1) is 0.25', () => {
    const s = solve({ ask: 'ig', left: [2, 1, 1, 0], right: [2, 1, 0, 1] });
    expect(s.entropy).toBeCloseTo(1.75);
    expect(s.weighted).toBeCloseTo(1.5);
    expect(s.value).toBeCloseTo(0.25);
    expect(solve({ ask: 'child', left: [2, 1, 1, 0], right: [2, 1, 0, 1] }).value).toBeCloseTo(1.5);
  });

  it('all built-in data keeps log2 integral', () => {
    ENTROPY_BASES.forEach(c => expect(hasDecimals(entropy(c), 3), c.join(',')).toBe(true));
    SPLITS.forEach(([l, r]) => {
      expect(l.reduce((a, b) => a + b, 0)).toBe(r.reduce((a, b) => a + b, 0));
      const gain = solve({ ask: 'ig', left: [...l], right: [...r] }).value;
      expect([0, 0.25, 0.5, 1].some(v => Math.abs(v - gain) < 1e-9), `${l}|${r}`).toBe(true);
    });
  });
});

describe('entropy-gini generator', () => {
  it('marks the independently recomputed value', () => {
    eachSeed(entropyGiniGenerator, makeParams, (item, p) => {
      // impurities and gains are never negative, so neither is any option
      expect(item.options.some(o => o.startsWith('-')), item.options.join(' | ')).toBe(false);
      if ('counts' in p) {
        const expected = p.ask === 'entropy' ? entropy(p.counts) : gini(p.counts);
        expect(answerText(item)).toBe(formatNum(expected));
        expect(hasDecimals(expected, 3)).toBe(true);
        return;
      }
      const parent = p.left.map((c, i) => c + p.right[i]);
      const n = parent.reduce((a, b) => a + b, 0);
      const size = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
      const weighted = (size(p.left) / n) * entropy(p.left) + (size(p.right) / n) * entropy(p.right);
      expect(answerText(item)).toBe(formatNum(p.ask === 'ig' ? entropy(parent) - weighted : weighted));
    });
  });
});
