import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { answerText, eachSeed } from './_testkit';
import { approxLog10, makeParams, solve, tfidfGenerator } from './tfidf';

describe('tfidf solve (hand-checked)', () => {
  it('log10 from log 2 = 0.3 and log 5 = 0.7', () => {
    const table: [number, number][] = [
      [1, 0], [2, 0.3], [4, 0.6], [5, 0.7], [8, 0.9], [10, 1], [20, 1.3], [25, 1.4],
      [40, 1.6], [50, 1.7], [100, 2], [200, 2.3], [250, 2.4], [500, 2.7], [1000, 3],
    ];
    table.forEach(([ratio, log]) => {
      expect(approxLog10(ratio)).toBeCloseTo(log, 9);
      expect(Math.abs(approxLog10(ratio) - Math.log10(ratio))).toBeLessThan(0.011);
    });
    expect(approxLog10(3)).toBeNaN();
  });

  it('TF-IDF = TF × log(N/DF)', () => {
    expect(solve({ ask: 'value', docs: 1000, terms: [{ word: '모델', tf: 3, df: 100 }], docLength: 0 }).value).toBeCloseTo(3);
    expect(solve({ ask: 'value', docs: 100, terms: [{ word: '모델', tf: 5, df: 20 }], docLength: 50 }).value).toBeCloseTo(0.07);
  });

  it('a word in every document scores 0 however frequent it is', () => {
    const s = solve({
      ask: 'compare',
      docs: 1000,
      terms: [{ word: '데이터', tf: 8, df: 1000 }, { word: '분석', tf: 4, df: 100 }, { word: '모델', tf: 1, df: 1 }, { word: '학습', tf: 3, df: 500 }],
      docLength: 0,
    });
    expect(s.scores.map(x => Math.round(x * 100) / 100)).toEqual([0, 4, 3, 0.9]);
    expect(s.value).toBe(1);
  });
});

describe('tfidf generator', () => {
  it('marks the independently recomputed score / best word', () => {
    eachSeed(tfidfGenerator, makeParams, (item, p) => {
      const score = (i: number): number => {
        const t = p.terms[i];
        return (p.docLength > 0 ? t.tf / p.docLength : t.tf) * approxLog10(p.docs / t.df);
      };
      if (p.ask === 'value') {
        expect(answerText(item)).toBe(formatNum(score(0)));
        return;
      }
      const scores = p.terms.map((_, i) => score(i));
      const best = scores.indexOf(Math.max(...scores));
      expect(answerText(item)).toBe(p.terms[best].word);
      expect([...item.options].sort()).toEqual(p.terms.map(t => t.word).sort());
      // neither the most frequent nor the rarest word is the answer (both naive shortcuts fail)
      const argmax = (xs: number[]): number => xs.indexOf(Math.max(...xs));
      expect(argmax(p.terms.map(t => t.tf))).not.toBe(best);
      expect(argmax(p.terms.map(t => approxLog10(p.docs / t.df)))).not.toBe(best);
    });
  });
});
