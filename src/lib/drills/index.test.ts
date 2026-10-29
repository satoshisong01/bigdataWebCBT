import { describe, expect, it } from 'vitest';
import { buildDrillSet, DRILL_GENERATORS } from './index';
import { STATS_GENERATORS } from './stats';

const STATS_KINDS = STATS_GENERATORS.map(g => g.kind);
const SOME = ['variance', 'bayes', 'dof'];

describe('DRILL_GENERATORS', () => {
  it('has unique kinds and includes every statistics family', () => {
    const kinds = DRILL_GENERATORS.map(g => g.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toEqual(expect.arrayContaining(STATS_KINDS));
  });
});

describe('buildDrillSet', () => {
  it('is deterministic for (kinds, seed, count)', () => {
    expect(buildDrillSet(SOME, 7, 12)).toEqual(buildDrillSet(SOME, 7, 12));
    expect(buildDrillSet(STATS_KINDS, 99, 20)).toEqual(buildDrillSet(STATS_KINDS, 99, 20));
  });

  it('returns exactly `count` items with ids `${kind}-${seed}-${i}`', () => {
    const set = buildDrillSet(SOME, 1234, 10);
    expect(set).toHaveLength(10);
    set.forEach((item, i) => expect(item.id).toBe(`${item.kind}-1234-${i}`));
    expect(new Set(set.map(item => item.id)).size).toBe(10);
    expect(buildDrillSet(SOME, 1234, 20)).toHaveLength(20);
    expect(buildDrillSet(SOME, 1234, 0)).toEqual([]);
  });

  it('cycles through the selected kinds in one seeded-shuffled order', () => {
    const set = buildDrillSet(SOME, 5, 9);
    const firstRound = set.slice(0, 3).map(item => item.kind);
    expect([...firstRound].sort()).toEqual([...SOME].sort());
    set.forEach((item, i) => expect(item.kind).toBe(firstRound[i % 3]));
  });

  it('shuffles the cycle order by seed', () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, seed) => buildDrillSet(SOME, seed, 3).map(item => item.kind).join(',')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('does not depend on the order or duplicates of the kinds argument', () => {
    expect(buildDrillSet(['dof', 'bayes', 'variance', 'dof'], 3, 8)).toEqual(buildDrillSet(SOME, 3, 8));
  });

  it('a shorter set is a prefix of a longer one', () => {
    expect(buildDrillSet(SOME, 42, 20).slice(0, 10)).toEqual(buildDrillSet(SOME, 42, 10));
  });

  it('ignores unknown kinds and returns [] when nothing matches', () => {
    expect(buildDrillSet(['nope'], 1, 5)).toEqual([]);
    expect(buildDrillSet([], 1, 5)).toEqual([]);
    const onlyDof = buildDrillSet(['nope', 'dof'], 1, 4);
    expect(onlyDof).toHaveLength(4);
    expect(onlyDof.every(item => item.kind === 'dof')).toBe(true);
  });

  it("'all' covers every registered generator", () => {
    const set = buildDrillSet('all', 2027, DRILL_GENERATORS.length);
    expect(new Set(set.map(item => item.kind))).toEqual(new Set(DRILL_GENERATORS.map(g => g.kind)));
    for (const item of set) {
      expect(new Set(item.options).size).toBe(4);
      expect(item.answer).toBeGreaterThanOrEqual(1);
      expect(item.answer).toBeLessThanOrEqual(4);
    }
  });

  it('carries each generator topic/title onto its items', () => {
    const byKind = new Map(DRILL_GENERATORS.map(g => [g.kind, g]));
    for (const item of buildDrillSet(STATS_KINDS, 8, 30)) {
      expect(item.topic).toBe(byKind.get(item.kind)?.topic);
      expect(item.title).toBe(byKind.get(item.kind)?.title);
    }
  });
});
