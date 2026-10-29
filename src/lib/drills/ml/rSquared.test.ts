import { describe, expect, it } from 'vitest';
import { answerText, eachSeed } from './_testkit';
import { makeParams, rSquaredGenerator, solve, type RSquaredParams } from './rSquared';
import { fixedNum } from './_shared';

const base: RSquaredParams = { sst: 200, sse: 40, n: 21, predictors: 4, ask: 'r2', given: 'sst-sse' };

describe('r-squared solve (hand-checked)', () => {
  it('SST 200, SSE 40, n 21, p 4 → R² 0.8, adjusted 0.75', () => {
    const s = solve(base);
    expect(s.ssr).toBe(160);
    expect(s.r2).toBeCloseTo(0.8);
    expect(s.adj).toBeCloseTo(0.75); // 1 − 0.2·20/16
  });

  it('SST 400, SSE 40, n 16, p 3 → adjusted 0.875', () => {
    expect(solve({ ...base, sst: 400, sse: 40, n: 16, predictors: 3, ask: 'adj' }).value).toBeCloseTo(0.875); // 1 − 0.1·15/12
  });

  it('SST 200, SSE 10, n 31, p 5 → adjusted 0.94', () => {
    expect(solve({ ...base, sse: 10, n: 31, predictors: 5, ask: 'adj' }).value).toBeCloseTo(0.94); // 1 − 0.05·30/25
  });
});

describe('r-squared generator', () => {
  it('marks the independently recomputed value at the answer precision', () => {
    eachSeed(rSquaredGenerator, makeParams, (item, q) => {
      const r2 = 1 - q.sse / q.sst;
      const adj = 1 - ((1 - r2) * (q.n - 1)) / (q.n - q.predictors - 1);
      const expected = q.ask === 'r2' ? fixedNum(r2, 2) : fixedNum(adj, 3);
      expect(answerText(item)).toBe(expected);
      expect(Number(expected)).toBeCloseTo(q.ask === 'r2' ? r2 : adj, 9);
      expect(adj).toBeLessThan(r2);
      item.options.forEach(o => expect(o).toMatch(q.ask === 'r2' ? /^\d\.\d{2}$/ : /^\d\.\d{3}$/));
    });
  });

  it('shows the two given sums of squares', () => {
    eachSeed(rSquaredGenerator, makeParams, (item, q) => {
      const ssr = q.sst - q.sse;
      const shown = { 'sst-sse': [q.sst, q.sse], 'ssr-sse': [ssr, q.sse], 'sst-ssr': [q.sst, ssr] }[q.given];
      shown.forEach(v => expect(item.prompt).toContain(`= ${v}$`));
    });
  });
});
