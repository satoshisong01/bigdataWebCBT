import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { makeParams, regMetricsGenerator, RMSE_SETS, solve } from './regMetrics';

describe('reg-metrics solve (hand-checked)', () => {
  it('errors 2, -1, -3, 5', () => {
    const s = solve({ actual: [12, 15, 9, 20], predicted: [10, 16, 12, 15], metric: 'mae' });
    expect(s.errors).toEqual([2, -1, -3, 5]);
    expect(s.mae).toBeCloseTo(2.75); // 11/4
    expect(s.mse).toBeCloseTo(9.75); // 39/4
    expect(s.rmse).toBeCloseTo(Math.sqrt(9.75));
    expect(s.mape).toBeCloseTo((100 * (2 / 12 + 1 / 15 + 3 / 9 + 5 / 20)) / 4);
  });

  it('RMSE with Σe² = 36 over 4 points is 3', () => {
    const s = solve({ actual: [20, 14, 25, 18], predicted: [19, 15, 22, 23], metric: 'rmse' });
    expect(s.mse).toBe(9);
    expect(s.value).toBe(3);
  });

  it('MAPE of 10%, 20%, 5%, 25% is 15%', () => {
    expect(solve({ actual: [100, 50, 200, 40], predicted: [90, 60, 190, 50], metric: 'mape' }).value).toBeCloseTo(15);
  });

  it('every RMSE magnitude set gives an integer RMSE', () => {
    RMSE_SETS.forEach(set => {
      const k = Math.sqrt(set.reduce((a, m) => a + m * m, 0) / set.length);
      expect(Number.isInteger(k), set.join(',')).toBe(true);
    });
  });
});

describe('reg-metrics generator', () => {
  it('marks the independently recomputed metric', () => {
    eachSeed(regMetricsGenerator, makeParams, (item, p) => {
      const e = p.actual.map((y, i) => y - p.predicted[i]);
      const n = e.length;
      const mse = e.reduce((a, x) => a + x * x, 0) / n;
      const expected = {
        mae: e.reduce((a, x) => a + Math.abs(x), 0) / n,
        mse,
        rmse: Math.sqrt(mse),
        mape: (100 * e.reduce((a, x, i) => a + Math.abs(x / p.actual[i]), 0)) / n,
      }[p.metric];
      const text = formatNum(expected, 2);
      expect(answerText(item)).toBe(p.metric === 'mape' ? `${text}%` : text);
      expect(hasDecimals(expected, 2)).toBe(true);
      expect(item.options.some(o => o.startsWith('-')), item.options.join(' | ')).toBe(false);
      if (p.metric === 'rmse') expect(Number.isInteger(expected)).toBe(true);
    });
  });
});
