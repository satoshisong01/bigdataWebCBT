import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { hasDecimals } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { confusionGenerator, makeParams, solve, type ConfusionParams } from './confusion';

const table = (tp: number, fp: number, fn: number, tn: number): ConfusionParams =>
  ({ tp, fp, fn, tn, metric: 'precision', actualRows: true });

describe('confusion solve (hand-checked)', () => {
  it('TP 30, FP 10, FN 20, TN 40', () => {
    const s = solve(table(30, 10, 20, 40));
    expect(s.precision).toBeCloseTo(0.75); // 30/40
    expect(s.recall).toBeCloseTo(0.6); // 30/50
    expect(s.specificity).toBeCloseTo(0.8); // 40/50
    expect(s.accuracy).toBeCloseTo(0.7); // 70/100
    expect(s.fpr).toBeCloseTo(0.2); // 10/50
    expect(s.f1).toBeCloseTo(2 / 3); // 60/90
    expect(s.value).toBeCloseTo(0.75);
  });

  it('F1 is the harmonic mean: P 0.75, R 0.5 → 0.6', () => {
    const s = solve({ ...table(30, 10, 30, 30), metric: 'f1' });
    expect(s.precision).toBeCloseTo(0.75);
    expect(s.recall).toBeCloseTo(0.5);
    expect(s.value).toBeCloseTo(0.6); // 2·30 / (60 + 10 + 30)
  });

  it('TP 15, FP 35, FN 10, TN 75 → F1 0.4', () => {
    expect(solve({ ...table(15, 35, 10, 75), metric: 'f1' }).value).toBeCloseTo(0.4); // 30/75
  });
});

describe('confusion generator', () => {
  it('marks the independently recomputed metric, with exam-friendly numbers', () => {
    eachSeed(confusionGenerator, makeParams, (item, p) => {
      const { tp, fp, fn, tn } = p;
      const expected = {
        accuracy: (tp + tn) / (tp + fp + fn + tn),
        precision: tp / (tp + fp),
        recall: tp / (tp + fn),
        specificity: tn / (tn + fp),
        fpr: fp / (fp + tn),
        f1: (2 * tp) / (2 * tp + fp + fn),
      }[p.metric];
      expect(answerText(item)).toBe(formatNum(expected));
      expect(hasDecimals(expected, p.metric === 'f1' ? 3 : 2)).toBe(true);
      [tp, fp, fn, tn].forEach(cell => expect(item.prompt).toContain(` ${cell} `));
    });
  });

  it('shows every option with at most the answer precision (no tidy-number giveaway)', () => {
    eachSeed(confusionGenerator, makeParams, (item, p) => {
      const digits = p.metric === 'f1' ? 3 : 2;
      item.options.forEach(o => expect((o.split('.')[1] ?? '').length).toBeLessThanOrEqual(digits));
    });
  });
});
