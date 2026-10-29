import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { seededRandom } from '@/lib/rng';
import {
  distinctOthers, fixedNum, gcd, hasDecimals, josa, nearby, paren, pipeline, roundTo, sampleUntil, signed, texFrac,
  texTable, tidyCount, tidyFirst, withCommas,
} from './_shared';

describe('ml/_shared number helpers', () => {
  it('detects short decimals despite float noise', () => {
    expect(hasDecimals(0.1 + 0.2, 1)).toBe(true);
    expect(hasDecimals(0.375, 3)).toBe(true);
    expect(hasDecimals(0.375, 2)).toBe(false);
    expect(hasDecimals(2 / 3, 3)).toBe(false);
    expect(hasDecimals(Number.NaN, 3)).toBe(false);
  });

  it('rounds, pads and formats', () => {
    expect(roundTo(1.2 * 25, 2)).toBe(30);
    expect(fixedNum(0.8, 2)).toBe('0.80');
    expect(fixedNum(0.875, 3)).toBe('0.875');
    expect(fixedNum(2 / 3, 2)).toBe('0.67');
    expect(withCommas(7850)).toBe('7,850');
    expect(withCommas(1000000)).toBe('1,000,000');
    expect(withCommas(784)).toBe('784');
    expect(signed(-1.5)).toBe('- 1.5');
    expect(signed(2)).toBe('+ 2');
    expect(paren(-1)).toBe('(-1)');
    expect(paren(0.5)).toBe('0.5');
    expect(gcd(12, 18)).toBe(6);
  });

  it('reduces fractions to LaTeX', () => {
    expect(texFrac(2, 8)).toBe(String.raw`\frac{1}{4}`);
    expect(texFrac(8, 4)).toBe('2');
  });

  it('orders tidy mistakes first and counts distinct ones', () => {
    expect(tidyFirst([1 / 3, 0.25, 0.5], 2)).toEqual(['0.25', '0.5', '0.333']);
    expect(tidyCount('0.5', [0.5, 0.25, 1 / 3, 0.25, 0.75], 2)).toBe(2);
    expect(distinctOthers('a', ['a', 'b', 'b', '', 'NaN', 'c'])).toBe(2);
  });

  it('pads with nearby valid values', () => {
    expect(nearby(0.5, 0.25, x => String(x), x => x > 0 && x < 1)).toEqual(['0.75', '0.25']);
  });

  it('picks Korean particles by the final consonant', () => {
    expect(josa('모델', '이', '가')).toBe('이');
    expect(josa('데이터', '이', '가')).toBe('가');
    expect(josa('학습', '은', '는')).toBe('은');
    expect(josa('TF', '은', '는')).toBe('는');
  });
});

describe('ml/_shared sampling and LaTeX', () => {
  it('samples deterministically and falls back when nothing is accepted', () => {
    const draw = (r: () => number): number => Math.floor(r() * 100);
    expect(sampleUntil(seededRandom(3), draw, x => x % 7 === 0, -1)).toBe(sampleUntil(seededRandom(3), draw, x => x % 7 === 0, -1));
    expect(sampleUntil(seededRandom(3), draw, () => false, -1, 10)).toBe(-1);
  });

  it('builds a KaTeX array with real row breaks', () => {
    const table = texTable('c|cc', [['', 'a', 'b'], ['x', 1, 2], ['y', 3, 4]]);
    expect(table).toBe(String.raw`\begin{array}{c|cc}  & a & b \\ \hline x & 1 & 2 \\ y & 3 & 4 \end{array}`);
    expect(() => katex.renderToString(table, { throwOnError: true, strict: 'error' })).not.toThrow();
  });

  it('wires makeParams → solve → render into a DrillGenerator', () => {
    const gen = pipeline(
      { kind: 'demo', title: '데모', topic: '4.1.1.1' },
      r => Math.floor(r() * 10),
      p => p * 2,
      (p, s) => ({ title: 't', prompt: `${p}`, options: ['a', 'b', 'c', 'd'], answer: 1, solution: `${s}` }),
    );
    const item = gen.generate(seededRandom(1), 'demo-1-0');
    expect(item).toMatchObject({ id: 'demo-1-0', kind: 'demo', topic: '4.1.1.1' });
    expect(Number(item.solution)).toBe(Number(item.prompt) * 2);
  });
});
