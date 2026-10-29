import { describe, expect, it } from 'vitest';
import { formatNum } from '../util';
import { answerText, eachSeed } from './_testkit';
import { kmeansGenerator, makeParams, solve, type Point } from './kmeans';

describe('kmeans solve (hand-checked)', () => {
  it('assigns by squared distance and averages the members', () => {
    const s = solve({
      points: [[1, 2], [2, 1], [3, 3], [6, 5], [8, 7], [7, 9]],
      centroids: [[1, 1], [7, 6]],
      target: 0,
    });
    expect(s.dist2[2]).toEqual([8, 25]); // (3,3): 4+4 vs 16+9
    expect(s.assign).toEqual([0, 0, 0, 1, 1, 1]);
    expect(s.next).toEqual([[2, 2], [7, 7]]);
    expect(s.value).toEqual([2, 2]);
  });

  it('a far point can still join the nearer centroid', () => {
    const s = solve({ points: [[7, 0], [0, 0], [8, 6], [9, 8], [8, 7]], centroids: [[2, 2], [6, 9]], target: 0 });
    expect(s.dist2[0]).toEqual([29, 82]);
    expect(s.value).toEqual([3.5, 0]);
  });
});

describe('kmeans generator', () => {
  it('marks the independently recomputed centroid; assignments are never near-ties', () => {
    eachSeed(kmeansGenerator, makeParams, (item, p) => {
      const d2 = (pt: Point, c: Point): number => (pt[0] - c[0]) ** 2 + (pt[1] - c[1]) ** 2;
      const members = p.points.filter(pt => {
        const [a, b] = [d2(pt, p.centroids[0]), d2(pt, p.centroids[1])];
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(4);
        return (a < b ? 0 : 1) === p.target;
      });
      expect(members.length).toBeGreaterThanOrEqual(2);
      const mean = (k: 0 | 1): number => members.reduce((acc, pt) => acc + pt[k], 0) / members.length;
      expect(answerText(item)).toBe(`(${formatNum(mean(0), 2)}, ${formatNum(mean(1), 2)})`);
      expect(Number.isInteger(mean(0) * 2) && Number.isInteger(mean(1) * 2)).toBe(true);
    });
  });
});
