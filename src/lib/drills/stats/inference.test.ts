import { describe, expect, it } from 'vitest';
import { chiSquare, CHI_EXPECTED, expectedCounts, type ChiParams } from './chisq';
import { DOF, type DofParams } from './dof';
import { rawSampleSize, SAMPLE_SIZE, type SampleSizeParams } from './samplesize';
import { STD_ERROR, type StdErrorParams } from './stderror';
import { allocate, STRATIFIED, type StratifiedParams } from './stratified';

describe('stratified — solve fixtures', () => {
  const cases: [StratifiedParams, number][] = [
    [{ ask: 'allocation', context: 0, sizes: [400, 300, 300], sample: 50, target: 0 }, 20],
    [{ ask: 'allocation', context: 2, sizes: [250, 500, 750, 1000], sample: 100, target: 2 }, 30],
    [{ ask: 'total-sample', context: 1, sizes: [400, 600, 1000], sample: 100, target: 0 }, 100],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(STRATIFIED.solve(params)).toBeCloseTo(expected, 9);
  });

  it('allocate is proportional to stratum size', () => {
    expect(allocate([400, 600, 1000], 100)).toEqual([20, 30, 50]);
  });

  it('distractors: equal allocation, proportion read as count, neighbouring stratum', () => {
    const { distractors } = STRATIFIED.render({ ask: 'allocation', context: 0, sizes: [400, 300, 300], sample: 50, target: 0 });
    expect(distractors).toEqual(expect.arrayContaining(['17', '40', '15']));
  });

  it('total-sample shows the known stratum count and models n_h × k', () => {
    const { prompt, distractors } = STRATIFIED.render({ ask: 'total-sample', context: 1, sizes: [400, 600, 1000], sample: 100, target: 0 });
    expect(prompt).toContain('$20$명을');
    expect(distractors).toEqual(expect.arrayContaining(['60', '80']));
  });
});

describe('std-error-ci — solve fixtures', () => {
  const ci = { mean: 50, sigma: 10, n: 25 };
  const cases: [StdErrorParams, number][] = [
    [{ ask: 'se', sigma: 10, n: 25 }, 2],
    [{ ask: 'se-prop', phat: 0.5, n: 100 }, 0.05],
    [{ ask: 'se-prop', phat: 0.2, n: 400 }, 0.02],
    [{ ask: 'ci-upper', ...ci, level: 95 }, 53.92],
    [{ ask: 'ci-lower', ...ci, level: 99 }, 44.848],
    [{ ask: 'moe', ...ci, level: 90 }, 3.29],
    [{ ask: 'width', ...ci, level: 95 }, 7.84],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(STD_ERROR.solve(params)).toBeCloseTo(expected, 9);
  });

  it('CI distractors: the other two z values and forgetting √n', () => {
    const { distractors, prompt } = STD_ERROR.render({ ask: 'ci-upper', ...ci, level: 95 });
    expect(prompt).toContain('z_{0.025} = 1.96');
    // 50 + 1.645·2, 50 + 2.576·2, 50 + 1.96·10
    expect(distractors).toEqual(expect.arrayContaining(['53.29', '55.152', '69.6']));
  });

  it('se distractors: σ/n and σ²/n', () => {
    expect(STD_ERROR.render({ ask: 'se', sigma: 10, n: 25 }).distractors).toEqual(expect.arrayContaining(['0.4', '4']));
  });
});

describe('sample-size — solve fixtures', () => {
  const cases: [SampleSizeParams, number][] = [
    [{ ask: 'mean', level: 95, sigma: 10, e: 2 }, 97],
    [{ ask: 'mean', level: 95, sigma: 50, e: 2 }, 2401],
    [{ ask: 'mean', level: 90, sigma: 4, e: 2 }, 11],
    [{ ask: 'prop', level: 95, phat: 0.5, e: 0.05 }, 385],
    [{ ask: 'prop', level: 95, phat: 0.2, e: 0.04 }, 385],
    [{ ask: 'error-scale', factor: 3 }, 9],
    [{ ask: 'se-scale', factor: 2 }, 0.5],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(SAMPLE_SIZE.solve(params)).toBeCloseTo(expected, 9);
  });

  it('rawSampleSize keeps exact squares exact (49² must not round up to 2402)', () => {
    expect(rawSampleSize(95, 25)).toBe(2401);
    expect(rawSampleSize(95, 5)).toBe(96.04);
    expect(rawSampleSize(90, 2)).toBe(10.8241);
  });

  it('distractors: rounded down, forgot to square, forgot z', () => {
    const { distractors } = SAMPLE_SIZE.render({ ask: 'mean', level: 95, sigma: 10, e: 2 });
    expect(distractors).toEqual(expect.arrayContaining(['96', '10', '25']));
  });
});

describe('dof — solve fixtures', () => {
  const anova = { groups: 4, perGroup: 10 };
  const cases: [DofParams, number][] = [
    [{ ask: 'one-sample-t', n: 15 }, 14],
    [{ ask: 'paired-t', pairs: 12 }, 11],
    [{ ask: 'two-sample-t', n1: 12, n2: 15 }, 25],
    [{ ask: 'chi-independence', rows: 3, cols: 4, total: 200 }, 6],
    [{ ask: 'chi-gof', categories: 6, total: 120 }, 5],
    [{ ask: 'anova-between', ...anova }, 3],
    [{ ask: 'anova-within', ...anova }, 36],
    [{ ask: 'anova-total', ...anova }, 39],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(DOF.solve(params)).toBe(expected);
  });

  it('paired-t distractor treats the pairs as two independent samples', () => {
    expect(DOF.render({ ask: 'paired-t', pairs: 12 }).distractors).toContain('22');
  });
});

describe('chi-expected — solve fixtures', () => {
  const cases: [ChiParams, number][] = [
    [{ ask: 'expected', context: 0, observed: [[30, 20], [10, 40]], row: 0, col: 0 }, 20],
    [{ ask: 'expected', context: 0, observed: [[30, 20], [10, 40]], row: 1, col: 1 }, 30],
    [{ ask: 'expected', context: 3, observed: [[30, 20, 10], [20, 10, 10]], row: 0, col: 2 }, 12],
    [{ ask: 'statistic', context: 0, observed: [[30, 20], [20, 30]] }, 4],
    [{ ask: 'statistic', context: 1, observed: [[24, 76], [16, 84]] }, 2],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(CHI_EXPECTED.solve(params)).toBeCloseTo(expected, 9);
  });

  it('expectedCounts / chiSquare', () => {
    expect(expectedCounts([[24, 76], [16, 84]])).toEqual([[20, 80], [20, 80]]);
    expect(chiSquare([[24, 76], [16, 84]])).toBe(2);
  });

  it('statistic distractors: no denominator, no square, single cell, divided by O', () => {
    const { distractors } = CHI_EXPECTED.render({ ask: 'statistic', context: 0, observed: [[30, 20], [20, 30]] });
    // Σ(O−E)² = 100, Σ|O−E|/E = 0.8, 25/25 = 1
    expect(distractors).toEqual(expect.arrayContaining(['100', '0.8', '1']));
  });

  it('expected distractors: the observed count and N / (r·c)', () => {
    const { distractors } = CHI_EXPECTED.render({ ask: 'expected', context: 0, observed: [[30, 20], [10, 40]], row: 0, col: 0 });
    expect(distractors).toEqual(expect.arrayContaining(['30', '25']));
  });
});
