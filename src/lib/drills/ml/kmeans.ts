/**
 * K-평균 군집 — 최근접 중심 할당 + 중심 갱신 1회 (출제기준 3.1.1.7 군집분석).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { distinctOthers, hasDecimals, im, pipeline, sampleUntil, sum, tex, type DrillBody } from './_shared';

export type Point = readonly [number, number];

export interface KMeansParams {
  points: Point[];
  centroids: readonly [Point, Point];
  /** cluster asked about: 0 → C1, 1 → C2 */
  target: 0 | 1;
}

export interface KMeansSolution {
  /** squared distances [to C1, to C2] per point */
  dist2: [number, number][];
  /** 0 | 1 per point (ties go to C1) */
  assign: number[];
  next: readonly [Point, Point];
  value: Point;
}

/** Minimum |d²(C1) − d²(C2)| so no assignment is a near tie. */
const MIN_MARGIN = 4;
const FALLBACK: Omit<KMeansParams, 'target'> = {
  points: [[1, 2], [2, 1], [3, 3], [6, 5], [8, 7], [7, 9]],
  centroids: [[1, 1], [7, 6]],
};

function dist2(p: Point, c: Point): number {
  return (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
}

function mean(points: readonly Point[]): Point {
  return [sum(points.map(p => p[0])) / points.length, sum(points.map(p => p[1])) / points.length];
}

export function solve(p: KMeansParams): KMeansSolution {
  const d = p.points.map(pt => [dist2(pt, p.centroids[0]), dist2(pt, p.centroids[1])] as [number, number]);
  const assign = d.map(([a, b]) => (a <= b ? 0 : 1));
  const members = (k: number): Point[] => p.points.filter((_, i) => assign[i] === k);
  const update = (k: 0 | 1): Point => (members(k).length > 0 ? mean(members(k)) : p.centroids[k]);
  const next = [update(0), update(1)] as const;
  return { dist2: d, assign, next, value: next[p.target] };
}

/** Centroids produced by the classic mistakes, most plausible first. */
function mistakes(p: KMeansParams, s: KMeansSolution): Point[] {
  const own = p.points.filter((_, i) => s.assign[i] === p.target);
  const others = p.points.filter((_, i) => s.assign[i] !== p.target);
  const center = p.centroids[p.target];
  const nearestOther = [...others].sort((a, b) => dist2(a, center) - dist2(b, center))[0];
  const farthestOwn = [...own].sort((a, b) => dist2(b, center) - dist2(a, center))[0];
  return [
    ...(nearestOther ? [mean([...own, nearestOther])] : []),
    mean(p.points),
    s.next[1 - p.target],
    ...(own.length >= 3 ? [mean(own.filter(pt => pt !== farthestOwn))] : []),
    center,
  ];
}

function pointText(pt: Point): string {
  return `(${formatNum(pt[0], 2)}, ${formatNum(pt[1], 2)})`;
}

function isTidy(pt: Point): boolean {
  return hasDecimals(pt[0], 2) && hasDecimals(pt[1], 2);
}

function isGood(p: KMeansParams): boolean {
  const s = solve(p);
  const clear = s.dist2.every(([a, b]) => Math.abs(a - b) >= MIN_MARGIN);
  const sizes = [0, 1].map(k => s.assign.filter(a => a === k).length);
  if (!clear || sizes.some(n => n < 2)) return false;
  const halfSteps = hasDecimals(s.value[0] * 2, 0) && hasDecimals(s.value[1] * 2, 0);
  return halfSteps && distinctOthers(pointText(s.value), mistakes(p, s).filter(isTidy).map(pointText)) >= 3;
}

function draw(rand: Rand, target: 0 | 1): KMeansParams {
  const centroids: readonly [Point, Point] = [[randInt(rand, 0, 3), randInt(rand, 0, 4)], [randInt(rand, 5, 9), randInt(rand, 3, 9)]];
  const count = pick([5, 6], rand);
  const points = Array.from({ length: count }, (): Point => [randInt(rand, 0, 9), randInt(rand, 0, 9)]);
  return { points, centroids, target };
}

function hasDuplicates(p: KMeansParams): boolean {
  const keys = [...p.points, ...p.centroids].map(pt => pt.join(','));
  return new Set(keys).size !== keys.length;
}

export function makeParams(rand: Rand): KMeansParams {
  const target: 0 | 1 = rand() < 0.5 ? 0 : 1;
  return sampleUntil(rand, r => draw(r, target), q => !hasDuplicates(q) && isGood(q), { ...FALLBACK, target }, 4000);
}

function explain(p: KMeansParams, s: KMeansSolution): string[] {
  const name = `C_${p.target + 1}`;
  const assignLines = p.points.map((pt, i) => {
    const [a, b] = s.dist2[i];
    return `${im(`P_${i + 1}${pointText(pt)}`)}: ${im(tex`d^2(C_1) = ${a}`)}, ${im(tex`d^2(C_2) = ${b}`)} → ${im(`C_${s.assign[i] + 1}`)}`;
  });
  const own = p.points.filter((_, i) => s.assign[i] === p.target);
  const labels = p.points.map((_, i) => i).filter(i => s.assign[i] === p.target).map(i => `P_${i + 1}`).join(', ');
  const axis = (k: 0 | 1): string => tex`\frac{${own.map(pt => pt[k]).join(' + ')}}{${own.length}}`;
  return [
    '1) 할당: 각 점을 제곱 유클리드 거리가 더 작은 중심에 배정합니다.',
    ...assignLines,
    `2) 갱신: ${im(name)} 군집 = {${im(labels)}} → 좌표별 평균`,
    im(tex`${name}' = \left(${axis(0)},\ ${axis(1)}\right) = ${pointText(s.value)}`),
    '※ 거리 비교는 제곱거리로 충분합니다(제곱근 생략). 새 중심은 할당된 점들만의 평균이며 이전 중심은 포함하지 않습니다.',
  ];
}

function render(p: KMeansParams, s: KMeansSolution, rand: Rand): DrillBody {
  const correct = pointText(s.value);
  const ranked = mistakes(p, s);
  const shifts: Point[] = [[0.5, 0], [0, 0.5], [-0.5, 0], [0, -0.5], [0.5, 0.5], [-0.5, -0.5]];
  const candidates = [
    ...ranked.filter(isTidy).map(pointText),
    ...ranked.filter(pt => !isTidy(pt)).map(pointText),
    ...shifts.map(([dx, dy]) => pointText([s.value[0] + dx, s.value[1] + dy])),
  ];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  const points = p.points.map((pt, i) => im(`P_${i + 1}${pointText(pt)}`)).join(', ');
  const [c1, c2] = p.centroids.map((c, i) => im(`C_${i + 1}${pointText(c)}`));
  return {
    title: 'K-평균 · 중심 갱신 1회',
    prompt: `K-평균 군집(k = 2)의 초기 중심이 ${c1}, ${c2}이다. 다음 점들을 유클리드 거리로 가장 가까운 중심에 할당한 뒤 `
      + `중심을 1회 갱신하면 ${im(`C_${p.target + 1}`)}의 새 좌표는?\n${points}`,
    options,
    answer,
    solution: explain(p, s).join('\n'),
  };
}

export const kmeansGenerator = pipeline(
  { kind: 'kmeans', title: 'K-평균 1회 갱신', topic: '3.1.1.7' },
  makeParams,
  solve,
  render,
);
