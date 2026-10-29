import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { assocRulesGenerator, ITEMS, makeParams, solve } from './assocRules';

describe('assoc-rules solve (hand-checked)', () => {
  it('8 transactions, n(X)=4, n(Y)=5, n(X∩Y)=2', () => {
    const s = solve({
      transactions: [[0, 1], [0, 1, 2], [0, 2], [0, 3], [1, 3], [1, 4], [1, 2], [2, 4]],
      lhs: [0],
      rhs: 1,
      metric: 'lift',
    });
    expect([s.n, s.nX, s.nY, s.nXY]).toEqual([8, 4, 5, 2]);
    expect(s.support).toBeCloseTo(0.25);
    expect(s.confidence).toBeCloseTo(0.5);
    expect(s.lift).toBeCloseTo(0.8); // 0.5 / (5/8)
  });

  it('two-item antecedent {우유, 버터} → {과자}', () => {
    const s = solve({ transactions: [[3], [1], [0, 1, 2, 3], [0, 1, 3, 4], [0, 1, 4]], lhs: [0, 3], rhs: 4, metric: 'confidence' });
    expect([s.nX, s.nY, s.nXY]).toEqual([2, 2, 1]);
    expect(s.value).toBeCloseTo(0.5);
    expect(s.lift).toBeCloseTo(1.25); // 1·5 / (2·2)
  });
});

describe('assoc-rules generator', () => {
  it('marks the independently recomputed measure and lists every transaction', () => {
    eachSeed(assocRulesGenerator, makeParams, (item, p) => {
      const hasX = (t: number[]): boolean => p.lhs.every(i => t.includes(i));
      const n = p.transactions.length;
      const nX = p.transactions.filter(hasX).length;
      const nY = p.transactions.filter(t => t.includes(p.rhs)).length;
      const nXY = p.transactions.filter(t => hasX(t) && t.includes(p.rhs)).length;
      const expected = { support: nXY / n, confidence: nXY / nX, lift: (nXY * n) / (nX * nY) }[p.metric];
      expect(answerText(item)).toBe(formatNum(expected));
      expect(hasDecimals(expected, 3)).toBe(true);
      p.transactions.forEach((t, i) => expect(item.prompt).toContain(`거래 ${i + 1}: ${t.map(j => ITEMS[j]).join(', ')}`));
    });
  });
});
