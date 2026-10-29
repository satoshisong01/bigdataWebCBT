import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { answerText, eachSeed } from './_testkit';
import { makeParams, pcaVarianceGenerator, solve, type PcaParams } from './pcaVariance';

const base: PcaParams = { ask: 'ratio', eigen: [2.4, 1.3, 0.7, 0.4, 0.2], standardized: true, m: 2, threshold: 80 };

describe('pca-variance solve (hand-checked)', () => {
  it('eigenvalues 2.4, 1.3, 0.7, 0.4, 0.2 (Σ = 5)', () => {
    const s = solve(base);
    expect(s.total).toBe(5);
    expect(s.ratios).toEqual([48, 26, 14, 8, 4]);
    expect(s.cumulative).toEqual([48, 74, 88, 96, 100]);
    expect(s.kaiser).toBe(2);
    expect(s.needed).toBe(3); // 88% ≥ 80%
    expect(s.value).toBe(26);
  });

  it('threshold and cumulative asks', () => {
    expect(solve({ ...base, ask: 'count', threshold: 70 }).value).toBe(2);
    expect(solve({ ...base, ask: 'count', threshold: 90 }).value).toBe(4);
    expect(solve({ ...base, ask: 'cumulative', m: 3 }).value).toBe(88);
  });

  it('covariance PCA with Σλ = 20', () => {
    expect(solve({ ...base, eigen: [9.5, 5, 3, 1.5, 1], standardized: false }).ratios).toEqual([47.5, 25, 15, 7.5, 5]);
  });
});

describe('pca-variance generator', () => {
  it('marks the independently recomputed answer', () => {
    eachSeed(pcaVarianceGenerator, makeParams, (item, p) => {
      const total = p.eigen.reduce((a, b) => a + b, 0);
      const pct = (upTo: number): number => (100 * p.eigen.slice(0, upTo).reduce((a, b) => a + b, 0)) / total;
      expect(p.eigen.every((l, i) => l > 0 && (i === 0 || l < p.eigen[i - 1]))).toBe(true);
      if (p.standardized) expect(total).toBeCloseTo(p.eigen.length, 9);
      switch (p.ask) {
        case 'ratio':
          expect(answerText(item)).toBe(`${formatNum((100 * p.eigen[p.m - 1]) / total, 1)}%`);
          break;
        case 'cumulative':
          expect(answerText(item)).toBe(`${formatNum(pct(p.m), 1)}%`);
          break;
        case 'count': {
          const needed = p.eigen.findIndex((_, i) => pct(i + 1) >= p.threshold - 1e-9) + 1;
          p.eigen.forEach((_, i) => expect(Math.abs(pct(i + 1) - p.threshold)).toBeGreaterThan(1e-9));
          expect(answerText(item)).toBe(`${needed}개`);
          break;
        }
        case 'kaiser':
          expect(answerText(item)).toBe(`${p.eigen.filter(l => l >= 1).length}개`);
          break;
      }
    });
  });
});
