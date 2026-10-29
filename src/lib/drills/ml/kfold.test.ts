import { describe, expect, it } from 'vitest';
import { withCommas } from './_shared';
import { answerText, eachSeed } from './_testkit';
import { kfoldGenerator, makeParams, solve } from './kfold';

describe('kfold solve (hand-checked)', () => {
  it('1,000 samples, 5-fold: train 800, validate 200, 5 fits', () => {
    expect(solve({ ask: 'train', n: 1000, k: 5, testRatio: 0, repeats: 1 })).toEqual({ pool: 1000, validSize: 200, trainSize: 800, fits: 5 });
  });

  it('20% hold-out then 4-fold on 1,200: 960 → train 720', () => {
    expect(solve({ ask: 'holdout', n: 1200, k: 4, testRatio: 0.2, repeats: 1 })).toMatchObject({ pool: 960, validSize: 240, trainSize: 720 });
  });

  it('LOOCV on 50 samples trains 50 times on 49; 5-fold × 3 repeats fits 15 models', () => {
    expect(solve({ ask: 'loocv', n: 50, k: 50, testRatio: 0, repeats: 1 })).toMatchObject({ trainSize: 49, fits: 50 });
    expect(solve({ ask: 'fits', n: 1000, k: 5, testRatio: 0, repeats: 3 }).fits).toBe(15);
  });
});

describe('kfold generator', () => {
  it('marks the independently recomputed count', () => {
    eachSeed(kfoldGenerator, makeParams, (item, p) => {
      const pool = Math.round(p.n * (1 - p.testRatio));
      const train = pool - pool / p.k;
      const expected = {
        train: `${withCommas(train)}개`,
        valid: `${withCommas(pool / p.k)}개`,
        holdout: `${withCommas(train)}개`,
        loocv: `${p.n}회 · 각 ${p.n - 1}개`,
        fits: `${withCommas(p.k * p.repeats)}회`,
      }[p.ask];
      expect(Number.isInteger(pool / p.k)).toBe(true);
      expect(answerText(item)).toBe(expected);
    });
  });
});
