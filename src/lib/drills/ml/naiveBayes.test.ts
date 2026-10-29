import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { makeParams, naiveBayesGenerator, solve } from './naiveBayes';

describe('naive-bayes solve (hand-checked)', () => {
  it('Bayes rule: prevalence 10%, sensitivity 90%, false positive 10% → 0.5', () => {
    const s = solve({ ask: 'bayes', story: 0, prior: 0.1, likeA: [0.9], likeB: [0.1] });
    expect(s.scoreA).toBeCloseTo(0.09);
    expect(s.scoreB).toBeCloseTo(0.09);
    expect(s.value).toBeCloseTo(0.5);
  });

  it('Bayes rule: 0.4·0.2 / (0.4·0.2 + 0.3·0.8) = 0.25', () => {
    expect(solve({ ask: 'bayes', story: 0, prior: 0.2, likeA: [0.4], likeB: [0.3] }).value).toBeCloseTo(0.25);
  });

  it('naive Bayes with two features: 0.048 / (0.048 + 0.016) = 0.75', () => {
    const s = solve({ ask: 'nb', story: 0, prior: 0.2, likeA: [0.4, 0.6], likeB: [0.1, 0.2] });
    expect(s.scoreA).toBeCloseTo(0.048);
    expect(s.scoreB).toBeCloseTo(0.016);
    expect(s.value).toBeCloseTo(0.75);
  });
});

describe('naive-bayes generator', () => {
  it('marks the independently recomputed posterior', () => {
    eachSeed(naiveBayesGenerator, makeParams, (item, p) => {
      const a = p.prior * p.likeA.reduce((x, y) => x * y, 1);
      const b = (1 - p.prior) * p.likeB.reduce((x, y) => x * y, 1);
      const posterior = a / (a + b);
      expect(answerText(item)).toBe(formatNum(posterior));
      expect(hasDecimals(posterior, 3)).toBe(true);
      expect(p.likeA.length).toBe(p.ask === 'bayes' ? 1 : 2);
    });
  });
});
