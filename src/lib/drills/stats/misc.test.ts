import { describe, expect, it } from 'vitest';
import { answerText } from './family';
import { coMoments, CORRELATION, pearson, type CorrelationParams } from './correlation';
import { DATA_UNITS, UNITS, type DataUnitsParams } from './dataunits';

describe('correlation — solve fixtures', () => {
  const cases: [CorrelationParams, number][] = [
    [{ ask: 'r', xs: [1, 2, 3, 4, 5], ys: [2, 1, 3, 5, 4] }, 0.8],
    [{ ask: 'cov', xs: [1, 2, 3, 4, 5], ys: [2, 1, 3, 5, 4] }, 2],
    [{ ask: 'r', xs: [2, 4, 6, 8], ys: [12, 16, 4, 8] }, -0.6],
    [{ ask: 'cov', xs: [2, 4, 6, 8], ys: [12, 16, 4, 8] }, -8],
    [{ ask: 'r-summary', cov: 12, sx: 4, sy: 5, giveVariance: true }, 0.6],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(CORRELATION.solve(params)).toBeCloseTo(expected, 9);
  });

  it('coMoments / pearson', () => {
    const m = coMoments([2, 4, 6, 8], [12, 16, 4, 8]);
    expect(m).toEqual({ n: 4, sxx: 20, syy: 80, sxy: -24 });
    expect(pearson(m)).toBe(-0.6);
  });

  it('r distractors: r², sign flip, mixed n / n-1', () => {
    const { distractors } = CORRELATION.render({ ask: 'r', xs: [1, 2, 3, 4, 5], ys: [2, 1, 3, 5, 4] });
    expect(distractors).toEqual(expect.arrayContaining(['0.64', '-0.8']));
  });

  it('cov distractors: divided by n, not divided', () => {
    const { distractors } = CORRELATION.render({ ask: 'cov', xs: [1, 2, 3, 4, 5], ys: [2, 1, 3, 5, 4] });
    expect(distractors).toEqual(expect.arrayContaining(['1.6', '8']));
  });

  it('variance-given summary: forgetting the square roots is a distractor', () => {
    const { distractors, prompt } = CORRELATION.render({ ask: 'r-summary', cov: 12, sx: 4, sy: 5, giveVariance: true });
    expect(prompt).toContain('V(X) = 16');
    expect(distractors).toContain('0.03');
  });
});

describe('data-units — solve fixtures', () => {
  const cases: [DataUnitsParams, number][] = [
    [{ ask: 'convert', amount: 3, from: 4 }, 3072],
    [{ ask: 'power', unit: 8 }, 80],
    [{ ask: 'ratio', big: 7, small: 3 }, 40],
    [{ ask: 'largest', units: [5, 8, 3, 6] }, 8],
    [{ ask: 'next', unit: 6 }, 7],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(DATA_UNITS.solve(params)).toBe(expected);
  });

  it('unit-name answers are rendered as names', () => {
    expect(UNITS).toEqual(['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']);
    expect(answerText(DATA_UNITS, { ask: 'largest', units: [5, 8, 3, 6] })).toBe('YB');
    expect(answerText(DATA_UNITS, { ask: 'next', unit: 6 })).toBe('ZB');
    expect(answerText(DATA_UNITS, { ask: 'power', unit: 6 })).toBe('60');
  });

  it('convert distractors: decimal 1000, two steps, 10×', () => {
    const { distractors, prompt } = DATA_UNITS.render({ ask: 'convert', amount: 3, from: 4 });
    expect(prompt).toContain('3\\,\\mathrm{TB}');
    expect(distractors).toEqual(['3000', '3145728', '30']);
  });

  it('power distractor uses the decimal exponent (10^3 per step)', () => {
    expect(DATA_UNITS.render({ ask: 'power', unit: 7 }).distractors).toContain('21');
  });
});
