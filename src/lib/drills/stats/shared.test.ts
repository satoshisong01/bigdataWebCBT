import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { seededRandom } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { choose, clean, composition, hasDecimals, nearby, sum, tidy, tidyProb, zeroSumDeviations } from './shared';
import { joinSum, paren, power, signed, texContingency, texList, texRows } from './tex';

describe('formatNum', () => {
  it.each([
    [2.5, '2.5'],
    [4, '4'],
    [1 / 3, '0.333'],
    [0.1 + 0.2, '0.3'],
    [-0.0001, '0'],
    [-2.5, '-2.5'],
    [0.0005, '0.001'],
    [-0.0005, '-0.001'],
    [1048576, '1048576'],
    [96.04, '96.04'],
  ])('%d → %s', (x, expected) => {
    expect(formatNum(x)).toBe(expected);
  });

  it('respects digits and flags non-finite input', () => {
    expect(formatNum(2 / 3, 2)).toBe('0.67');
    expect(formatNum(10.8241, 6)).toBe('10.8241');
    expect(formatNum(Number.NaN)).toBe('NaN');
    expect(formatNum(Infinity)).toBe('Infinity');
  });
});

describe('uniqueOptions', () => {
  const noFallback = (): string => {
    throw new Error('fallback should not be needed');
  };

  it('keeps the first 3 usable, distinct distractors and points at the correct option', () => {
    const { options, answer } = uniqueOptions('3', ['3', '4', '', 'NaN', '4', '5', 'undefined', '6', '7'], seededRandom(1), noFallback);
    expect([...options].sort()).toEqual(['3', '4', '5', '6']);
    expect(options[answer - 1]).toBe('3');
  });

  it('uses the fallback when candidates run short', () => {
    let next = 10;
    const { options } = uniqueOptions('1', ['2'], seededRandom(2), () => String(next++));
    expect([...options].sort()).toEqual(['1', '10', '11', '2']);
  });

  it('is deterministic for a seed and moves the answer around', () => {
    const run = (seed: number) => uniqueOptions('a', ['b', 'c', 'd'], seededRandom(seed), noFallback);
    expect(run(5)).toEqual(run(5));
    expect(new Set(Array.from({ length: 40 }, (_, s) => run(s).answer)).size).toBe(4);
  });

  it('throws instead of looping forever when 4 distinct options are impossible', () => {
    expect(() => uniqueOptions('1', [], seededRandom(3), () => '1')).toThrow(/distinct options/);
  });
});

describe('numeric helpers', () => {
  it('hasDecimals / tidy / tidyProb', () => {
    expect(hasDecimals(0.125, 3)).toBe(true);
    expect(hasDecimals(0.0625, 3)).toBe(false);
    expect(hasDecimals(0.1 + 0.2, 1)).toBe(true);
    expect(tidy(2.5)).toBe('2.5');
    expect(tidy(1 / 3)).toBe('');
    expect(tidyProb(1.2)).toBe('');
    expect(tidyProb(0.25)).toBe('0.25');
  });

  it('clean removes float noise', () => {
    expect(clean(0.6 * 0.7)).toBe(0.42);
    expect(clean(1.96 * 25)).toBe(49);
  });

  it('zeroSumDeviations: sums to 0, bounded, not all zero', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const d = zeroSumDeviations(seededRandom(seed), 5, 4);
      expect(d).toHaveLength(5);
      expect(sum(d)).toBe(0);
      expect(d.every(x => Math.abs(x) <= 4)).toBe(true);
      expect(d.some(x => x !== 0)).toBe(true);
    }
  });

  it('composition: positive parts summing to the total', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const parts = composition(seededRandom(seed), 10, 4);
      expect(parts).toHaveLength(4);
      expect(sum(parts)).toBe(10);
      expect(parts.every(p => p >= 1)).toBe(true);
    }
  });

  it('choose / nearby', () => {
    expect(choose(5, 2)).toBe(10);
    expect(choose(4, 0)).toBe(1);
    for (let seed = 1; seed <= 50; seed++) {
      const text = nearby(0.5, 0.1, seededRandom(seed), 0, 1);
      if (text !== '') expect(Math.abs(Number(text) - 0.5)).toBeGreaterThan(0.05);
    }
  });
});

describe('tex helpers', () => {
  it('format signs and lists', () => {
    expect(texList([3, 7.5, -1])).toBe('3, 7.5, -1');
    expect(paren(-3)).toBe('(-3)');
    expect(signed(-3)).toBe('- 3');
    expect(signed(4)).toBe('+ 4');
    expect(joinSum([4, 1, -2, 0])).toBe('4 + 1 - 2 + 0');
    expect(power('0.5', 1)).toBe('0.5');
    expect(power('0.5', 3)).toBe('0.5^{3}');
  });

  it('tables render in KaTeX', () => {
    const tables = [
      texRows([['x', ['0', '1']], ['P(X = x)', ['0.4', '0.6']]]),
      texContingency(['남성', '여성'], ['찬성', '반대', '보류'], [[30, 20, 10], [20, 10, 10]]),
    ];
    for (const t of tables) {
      expect(() => katex.renderToString(t, { throwOnError: true, strict: 'error' })).not.toThrow();
    }
    expect(tables[1]).toContain('\\text{합계} & 50 & 30 & 20 & 100');
  });
});
