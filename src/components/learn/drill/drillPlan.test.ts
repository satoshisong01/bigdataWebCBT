import { describe, it, expect } from 'vitest';
import type { DrillItem } from '@/lib/drills';
import { kindBreakdown, parseSeed, resolveKinds } from './drillPlan';

function item(kind: string, answer: number, title = kind.toUpperCase()): DrillItem {
  return { id: `${kind}-1-0`, kind, topic: '2.3.1.1', title, prompt: 'p', options: ['1', '2', '3', '4'], answer, solution: 's' };
}

describe('parseSeed', () => {
  it('accepts uint32 decimal strings only', () => {
    expect(parseSeed(null)).toBeNull();
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed('00012')).toBe(12);
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('4294967295')).toBe(4294967295);
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1e3')).toBeNull();
    expect(parseSeed('abc')).toBeNull();
    expect(parseSeed('12345678901')).toBeNull();
  });
});

describe('resolveKinds', () => {
  const all = ['a', 'b', 'c'];

  it("uses 'all' when every generator is selected", () => {
    expect(resolveKinds(new Set(all), all)).toBe('all');
  });

  it('keeps registry order for a partial selection', () => {
    expect(resolveKinds(new Set(['c', 'a']), all)).toEqual(['a', 'c']);
    expect(resolveKinds(new Set(['zzz']), all)).toEqual([]);
    expect(resolveKinds(new Set(), [])).toEqual([]);
  });
});

describe('kindBreakdown', () => {
  it('tallies answered items per kind in first-appearance order', () => {
    const items = [item('x', 1), item('y', 2), item('x', 3)];
    expect(kindBreakdown(items, [1, 1])).toEqual([
      { kind: 'x', title: 'X', correct: 1, total: 1 },
      { kind: 'y', title: 'Y', correct: 0, total: 1 },
    ]);
    expect(kindBreakdown(items, [1, 2, 3], new Map([['x', '엑스']]))).toEqual([
      { kind: 'x', title: '엑스', correct: 2, total: 2 },
      { kind: 'y', title: 'Y', correct: 1, total: 1 },
    ]);
    expect(kindBreakdown(items, [])).toEqual([]);
  });
});
