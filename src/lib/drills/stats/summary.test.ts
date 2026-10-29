import { describe, expect, it } from 'vitest';
import { CV, type CvParams } from './cv';
import { DESCRIPTIVE, median, type DescriptiveParams } from './descriptive';
import { fences, QUARTILE, quartiles, type QuartileParams } from './quartile';
import { SCALING, type ScalingParams } from './scaling';
import { moments, VARIANCE, type VarianceParams } from './variance';

describe('descriptive — solve fixtures', () => {
  const cases: [DescriptiveParams, number][] = [
    [{ stat: 'mean', data: [12, 7, 15, 9, 7] }, 10],
    [{ stat: 'median', data: [12, 7, 15, 9, 7, 20] }, 10.5],
    [{ stat: 'median', data: [5, 1, 9, 3, 7] }, 5],
    [{ stat: 'mode', data: [4, 9, 4, 2, 9, 4, 7] }, 4],
    [{ stat: 'range', data: [23, 5, 41, 12, 30] }, 36],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(DESCRIPTIVE.solve(params)).toBeCloseTo(expected, 9);
  });

  it('median sorts first and averages the middle pair', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('distractors model "forgot to sort" and "picked one middle value"', () => {
    // sorted 7 7 9 12 15 20 → 10.5; unsorted middle data[3] = 9, upper middle 12
    const { distractors } = DESCRIPTIVE.render({ stat: 'median', data: [12, 7, 15, 9, 7, 20] });
    expect(distractors).toEqual(expect.arrayContaining(['9', '12']));
  });

  it('mode distractors include the frequency itself', () => {
    expect(DESCRIPTIVE.render({ stat: 'mode', data: [4, 9, 4, 2, 9, 4, 7] }).distractors).toContain('3');
  });
});

describe('variance — solve fixtures', () => {
  const cases: [VarianceParams, number][] = [
    [{ target: 'sample-var', data: [8, 9, 10, 11, 12], summary: false }, 2.5],
    [{ target: 'pop-var', data: [8, 9, 10, 11, 12], summary: true }, 2],
    [{ target: 'sample-sd', data: [8, 8, 10, 12, 12], summary: false }, 2],
    [{ target: 'pop-sd', data: [8, 8, 12, 12], summary: false }, 2],
    [{ target: 'pop-sd', data: [2, 4, 4, 4, 5, 5, 7, 9], summary: false }, 2],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(VARIANCE.solve(params)).toBeCloseTo(expected, 9);
  });

  it('moments: deviations, n vs n-1', () => {
    expect(moments([2, 4, 4, 4, 5, 5, 7, 9])).toMatchObject({ n: 8, mean: 5, ss: 32, popVar: 4 });
    expect(moments([2, 4, 4, 4, 5, 5, 7, 9]).sampleVar).toBeCloseTo(32 / 7, 9);
  });

  it('distractors include the other denominator, the raw sum of squares and the forgotten root', () => {
    const sampleVar = VARIANCE.render({ target: 'sample-var', data: [8, 9, 10, 11, 12], summary: false });
    expect(sampleVar.distractors).toEqual(expect.arrayContaining(['2', '10']));
    const sampleSd = VARIANCE.render({ target: 'sample-sd', data: [8, 8, 10, 12, 12], summary: false });
    expect(sampleSd.distractors).toEqual(expect.arrayContaining(['4', '1.789', '3.2']));
  });

  it('summary prompt shows Σx and Σx²', () => {
    const { prompt } = VARIANCE.render({ target: 'sample-var', data: [8, 9, 10, 11, 12], summary: true });
    expect(prompt).toContain('\\sum x = 50');
    expect(prompt).toContain('\\sum x^2 = 510');
  });
});

describe('quartile-iqr — solve fixtures', () => {
  const cases: [QuartileParams, number][] = [
    [{ ask: 'iqr', data: [13, 1, 9, 5, 3, 11, 7] }, 8],
    [{ ask: 'iqr', data: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] }, 12],
    [{ ask: 'upper-fence', q1: 24, q3: 40 }, 64],
    [{ ask: 'lower-fence', q1: 24, q3: 40 }, 0],
    [{ ask: 'outlier-count', q1: 20, q3: 30, values: [2, 4, 6, 46, 50, 52] }, 5],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(QUARTILE.solve(params)).toBeCloseTo(expected, 9);
  });

  it('quartiles exclude the median from both halves (n = 4k + 3)', () => {
    expect(quartiles([1, 3, 5, 7, 9, 11, 13])).toEqual({ q1: 3, median: 7, q3: 11 });
    expect(fences(24, 40)).toEqual({ lower: 0, upper: 64 });
    expect(fences(24, 40, 3)).toEqual({ lower: -24, upper: 88 });
  });

  it('fence distractors: forgot 1.5, used 3·IQR, used the wrong quartile', () => {
    const { distractors } = QUARTILE.render({ ask: 'upper-fence', q1: 24, q3: 40 });
    expect(distractors).toEqual(expect.arrayContaining(['56', '88', '48']));
  });

  it('outlier-count distractor treats everything outside the box as an outlier', () => {
    const { distractors } = QUARTILE.render({ ask: 'outlier-count', q1: 20, q3: 30, values: [2, 4, 6, 25, 46, 50] });
    // fences 5 / 45 → 2, 4, 46, 50 → 4; outside [20, 30] → 5
    expect(QUARTILE.solve({ ask: 'outlier-count', q1: 20, q3: 30, values: [2, 4, 6, 25, 46, 50] })).toBe(4);
    expect(distractors).toContain('5');
  });
});

describe('scaling — solve fixtures', () => {
  const cases: [ScalingParams, number][] = [
    [{ ask: 'z', x: 85, mu: 70, sigma: 10, giveVariance: false }, 1.5],
    [{ ask: 'z', x: 62, mu: 70, sigma: 4, giveVariance: true }, -2],
    [{ ask: 'z-inverse', z: -1.25, mu: 60, sigma: 8 }, 50],
    [{ ask: 'minmax', x: 35, min: 10, max: 60 }, 0.5],
    [{ ask: 'minmax-inverse', scaled: 0.75, min: 20, max: 60 }, 50],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(SCALING.solve(params)).toBeCloseTo(expected, 9);
  });

  it('z distractors: sign flip and dividing by the variance', () => {
    const { prompt, distractors } = SCALING.render({ ask: 'z', x: 62, mu: 70, sigma: 4, giveVariance: true });
    expect(prompt).toContain('분산이 $16$');
    expect(distractors).toEqual(expect.arrayContaining(['2', '-0.5']));
  });
});

describe('cv — solve fixtures', () => {
  const cases: [CvParams, number][] = [
    [{ ask: 'single', mean: 50, sd: 10, giveVariance: false }, 20],
    [{ ask: 'single', mean: 80, sd: 6, giveVariance: true }, 7.5],
    [{ ask: 'compare', a: { mean: 40, sd: 8 }, b: { mean: 200, sd: 20 } }, 20],
    [{ ask: 'compare', a: { mean: 500, sd: 25 }, b: { mean: 25, sd: 4 } }, 16],
  ];
  it.each(cases)('%j → %d', (params, expected) => {
    expect(CV.solve(params)).toBeCloseTo(expected, 9);
  });

  it('compare distractor is the larger-σ group (smaller CV)', () => {
    const { distractors } = CV.render({ ask: 'compare', a: { mean: 40, sd: 8 }, b: { mean: 200, sd: 20 } });
    expect(distractors).toEqual(expect.arrayContaining(['10', '0.2']));
  });
});
