import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { makeParams, movingAverageGenerator, solve } from './movingAverage';

describe('moving-average solve (hand-checked)', () => {
  it('3-month SMA of the last three months', () => {
    expect(solve({ ask: 'sma', series: [52, 61, 48, 57, 66, 60], window: 3, alpha: 0, forecast: 0 }).value).toBe(61); // 183/3
    expect(solve({ ask: 'sma', series: [33, 28, 48, 53, 57, 59], window: 4, alpha: 0, forecast: 0 }).value).toBe(54.25); // 217/4
  });

  it('exponential smoothing: 0.3·120 + 0.7·100 = 106', () => {
    expect(solve({ ask: 'ses', series: [120], window: 0, alpha: 0.3, forecast: 100 }).value).toBeCloseTo(106);
  });

  it('two steps: F2 = 108, F3 = 0.4·90 + 0.6·108 = 100.8', () => {
    const s = solve({ ask: 'ses2', series: [120, 90], window: 0, alpha: 0.4, forecast: 100 });
    expect(s.step).toBeCloseTo(108);
    expect(s.value).toBeCloseTo(100.8);
  });
});

describe('moving-average generator', () => {
  it('marks the independently recomputed forecast', () => {
    eachSeed(movingAverageGenerator, makeParams, (item, p) => {
      const smooth = (y: number, f: number): number => p.alpha * y + (1 - p.alpha) * f;
      const recent = p.series.slice(-p.window);
      const expected = {
        sma: recent.reduce((a, b) => a + b, 0) / p.window,
        ses: smooth(p.series[0], p.forecast),
        ses2: smooth(p.series[1], smooth(p.series[0], p.forecast)),
      }[p.ask];
      expect(answerText(item)).toBe(formatNum(expected, 2));
      expect(hasDecimals(expected, 2)).toBe(true);
    });
  });
});
