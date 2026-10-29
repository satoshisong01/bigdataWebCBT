import { describe, expect, it } from 'vitest';
import { BAYES, type BayesParams } from './bayes';
import { BINOMIAL, type BinomialParams } from './binomial';
import { discreteMoments, EXPECTATION, type ExpectationParams } from './expectation';

describe('bayes — solve fixtures', () => {
  const cases: [BayesParams, number][] = [
    [{ ask: 'conditional', pA: 0.3, pB: 0.4, pAB: 0.2 }, 0.5],
    [{ ask: 'conditional', pA: 0.45, pB: 0.2, pAB: 0.18 }, 0.9],
    [{ ask: 'total', prior: 0.1, sens: 0.9, fpr: 0.1, context: 0 }, 0.18],
    [{ ask: 'posterior', prior: 0.1, sens: 0.9, fpr: 0.1, context: 0 }, 0.5],
    [{ ask: 'posterior', prior: 0.3, sens: 0.7, fpr: 0.1, context: 1 }, 0.75],
    [{ ask: 'posterior', prior: 0.05, sens: 0.6, fpr: 0.1, context: 2 }, 0.24],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(BAYES.solve(params)).toBeCloseTo(expected, 9);
  });

  it('conditional distractors: swapped condition and independence assumption', () => {
    const { distractors } = BAYES.render({ ask: 'conditional', pA: 0.45, pB: 0.2, pAB: 0.18 });
    expect(distractors).toEqual(expect.arrayContaining(['0.4', '0.09', '0.18']));
  });

  it('posterior distractors: test accuracy (base-rate neglect) and the joint probability', () => {
    const { distractors, solution } = BAYES.render({ ask: 'posterior', prior: 0.1, sens: 0.9, fpr: 0.1, context: 0 });
    expect(distractors).toEqual(expect.arrayContaining(['0.9', '0.09', '0.18']));
    expect(solution).toContain('0.09 + 0.09 = 0.18');
  });
});

describe('binomial — solve fixtures', () => {
  const cases: [BinomialParams, number][] = [
    [{ ask: 'mean', n: 20, p: 0.3 }, 6],
    [{ ask: 'var', n: 20, p: 0.3 }, 4.2],
    [{ ask: 'sd', n: 100, p: 0.5 }, 5],
    [{ ask: 'sd', n: 48, p: 0.25 }, 3],
    [{ ask: 'pmf', n: 3, p: 0.2, k: 1, context: 0 }, 0.384],
    [{ ask: 'pmf', n: 4, p: 0.5, k: 2, context: 1 }, 0.375],
    [{ ask: 'at-least-one', n: 3, p: 0.1, context: 0 }, 0.271],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(BINOMIAL.solve(params)).toBeCloseTo(expected, 9);
  });

  it('pmf distractors: dropped nCk and swapped p / 1-p', () => {
    const { distractors } = BINOMIAL.render({ ask: 'pmf', n: 3, p: 0.2, k: 1, context: 0 });
    // p·q² = 0.128, 3·p²·q = 0.096
    expect(distractors).toEqual(expect.arrayContaining(['0.128', '0.096']));
  });

  it('variance distractors: the mean and the standard deviation', () => {
    const { distractors } = BINOMIAL.render({ ask: 'var', n: 100, p: 0.2 });
    expect(distractors).toEqual(expect.arrayContaining(['20', '4']));
  });
});

describe('expectation — solve fixtures', () => {
  const table = { xs: [0, 1, 2, 3], ps: [0.1, 0.3, 0.4, 0.2], hidden: null };
  const cases: [ExpectationParams, number][] = [
    [{ ask: 'linear-mean', a: 3, b: -4, mean: 5 }, 11],
    [{ ask: 'linear-var', a: -2, b: 7, variance: 9 }, 36],
    [{ ask: 'linear-sd', a: -3, b: 2, sd: 4 }, 12],
    [{ ask: 'discrete-mean', ...table }, 1.7],
    [{ ask: 'discrete-var', ...table }, 0.81],
    [{ ask: 'discrete-var', xs: [2, 3, 4], ps: [0.6, 0.3, 0.1], hidden: 1 }, 0.45],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(EXPECTATION.solve(params)).toBeCloseTo(expected, 9);
  });

  it('discreteMoments: E(X), E(X²), V(X)', () => {
    expect(discreteMoments([0, 1, 2, 3], [0.1, 0.3, 0.4, 0.2])).toEqual({ mean: 1.7, second: 3.7, variance: 0.81 });
  });

  it('linear-var distractors: a not squared, constant added', () => {
    const { distractors } = EXPECTATION.render({ ask: 'linear-var', a: -2, b: 7, variance: 9 });
    expect(distractors).toEqual(expect.arrayContaining(['-18', '43']));
  });

  it('a hidden probability is shown as a and derived in the solution', () => {
    const { prompt, solution } = EXPECTATION.render({ ask: 'discrete-mean', xs: [2, 3, 4], ps: [0.6, 0.3, 0.1], hidden: 1 });
    expect(prompt).toContain('& a &');
    expect(solution).toContain('a = 1 - (0.6 + 0.1) = 0.3');
  });
});
