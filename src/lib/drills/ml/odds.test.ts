import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { EXP_PAIRS, makeParams, oddsGenerator, solve } from './odds';

describe('odds solve (hand-checked)', () => {
  it('x₂ up by 2 with e^1.099 = 3 multiplies the odds by 9', () => {
    const [two, three] = EXP_PAIRS;
    expect(solve({ ask: 'coef', intercept: -1.2, betas: [two, three], target: 1, delta: 2 }).value).toBe(9);
  });

  it('p = 0.8 → odds 4, p = 0.25 → odds 1/3', () => {
    expect(solve({ ask: 'prob-to-odds', prob: 0.8 }).value).toBeCloseTo(4);
    expect(solve({ ask: 'prob-to-odds', prob: 0.25 }).value).toBeCloseTo(1 / 3);
  });

  it('logit −1.386 + 0.693·3 = ln 2 → p = 2/3; 2.772 − 0.693·2 = ln 4 → p = 0.8', () => {
    expect(solve({ ask: 'logit', b0Units: -2, b1Units: 1, x: 3 }).value).toBeCloseTo(2 / 3);
    expect(solve({ ask: 'logit', b0Units: 4, b1Units: -1, x: 2 }).value).toBeCloseTo(0.8);
  });

  it('2×2 odds ratio ad/bc', () => {
    expect(solve({ ask: 'table', a: 20, b: 80, c: 10, d: 90 }).value).toBeCloseTo(2.25); // 1800/800
    expect(solve({ ask: 'table', a: 30, b: 20, c: 20, d: 40 }).value).toBeCloseTo(3); // 1200/400
  });

  it('every printed e^β is accurate to 1%', () => {
    EXP_PAIRS.forEach(({ beta, exp }) => expect(Math.abs(Math.exp(beta) - exp) / exp).toBeLessThan(0.01));
  });
});

describe('odds generator', () => {
  it('marks the independently recomputed value', () => {
    eachSeed(oddsGenerator, makeParams, (item, p) => {
      switch (p.ask) {
        case 'coef': {
          const e = p.betas[p.target].exp;
          expect(answerText(item)).toBe(`${formatNum(e ** p.delta)}배`);
          p.betas.forEach(b => expect(item.prompt).toContain(`e^{${formatNum(b.beta)}} = ${formatNum(b.exp)}`));
          break;
        }
        case 'prob-to-odds':
          expect(answerText(item)).toBe(formatNum(p.prob / (1 - p.prob)));
          break;
        case 'logit': {
          const z = (p.b0Units + p.b1Units * p.x) * Math.log(2);
          expect(answerText(item)).toBe(formatNum(1 / (1 + Math.exp(-z))));
          break;
        }
        case 'table': {
          const or = (p.a * p.d) / (p.b * p.c);
          expect(answerText(item)).toBe(formatNum(or));
          expect(hasDecimals(or, 2) && or > 1).toBe(true);
          break;
        }
      }
    });
  });
});
