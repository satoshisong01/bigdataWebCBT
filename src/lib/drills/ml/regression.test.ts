import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { makeParams, regressionGenerator, solve, type RegressionParams } from './regression';

const none = { xBar: 0, yBar: 0, sxx: 0, sxy: 0 };

describe('regression solve (hand-checked)', () => {
  it('ŷ = 4 + 0.8x at x = 9 is 11.2', () => {
    expect(solve({ ask: 'predict', b0: 4, b1: 0.8, x: 9, y: 0, ...none }).value).toBeCloseTo(11.2);
  });

  it('residual of (12, 12.5) under ŷ = 2.5 + 0.5x is 4', () => {
    const s = solve({ ask: 'residual', b0: 2.5, b1: 0.5, x: 12, y: 12.5, ...none });
    expect(s.yHat).toBeCloseTo(8.5);
    expect(s.value).toBeCloseTo(4);
  });

  it('least squares: x̄ 5, ȳ 16, Sxx 40, Sxy 120 → ŷ(7) = 22', () => {
    const p: RegressionParams = { ask: 'fit', b0: 0, b1: 0, x: 7, y: 0, xBar: 5, yBar: 16, sxx: 40, sxy: 120 };
    const s = solve(p);
    expect(s.b1).toBe(3);
    expect(s.b0).toBe(1);
    expect(s.value).toBe(22);
  });
});

describe('regression generator', () => {
  it('marks the independently recomputed prediction / residual', () => {
    eachSeed(regressionGenerator, makeParams, (item, p) => {
      const b1 = p.ask === 'fit' ? p.sxy / p.sxx : p.b1;
      const b0 = p.ask === 'fit' ? p.yBar - b1 * p.xBar : p.b0;
      const yHat = b0 + b1 * p.x;
      const expected = p.ask === 'residual' ? p.y - yHat : yHat;
      expect(answerText(item)).toBe(formatNum(expected, 2));
      expect(hasDecimals(expected, 2)).toBe(true);
      if (p.ask === 'fit') {
        expect(Number.isInteger(p.sxy)).toBe(true);
        expect(b1).toBeCloseTo(p.b1, 9); // the drawn line is the least-squares line
      }
    });
  });
});
