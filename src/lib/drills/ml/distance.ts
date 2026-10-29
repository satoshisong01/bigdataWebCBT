/**
 * 군집분석 거리·유사도 — 유클리드·맨해튼·체비셰프·코사인·자카드 (출제기준 3.1.1.7 군집분석).
 * Euclidean items use Pythagorean differences so the square root is an integer.
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  distinctOthers, hasDecimals, im, nearby, pipeline, sampleUntil, sum, tex, tidyCount, tidyFirst, type DrillBody,
} from './_shared';

export type DistanceAsk = 'euclid' | 'manhattan' | 'chebyshev' | 'cosine' | 'jaccard';

export interface DistanceParams {
  ask: DistanceAsk;
  a: number[];
  b: number[];
  /** jaccard only: show a and b (binary vectors) as item sets */
  asSets: boolean;
}

export interface DistanceSolution {
  /** |a_i − b_i| */
  gaps: number[];
  euclid: number;
  manhattan: number;
  chebyshev: number;
  dot: number;
  normA: number;
  normB: number;
  cosine: number;
  /** binary match counts (1-1, 1-0, 0-1, 0-0) */
  f11: number;
  f10: number;
  f01: number;
  f00: number;
  jaccard: number;
  value: number;
}

const ASKS: readonly DistanceAsk[] = ['euclid', 'manhattan', 'chebyshev', 'cosine', 'jaccard'];
/** |differences| whose squares sum to a perfect square */
export const PYTHAGOREAN: readonly (readonly number[])[] = [
  [3, 4], [6, 8], [5, 12], [8, 15], [9, 12], [1, 2, 2], [2, 3, 6], [2, 6, 9], [1, 4, 8], [4, 4, 7], [2, 4, 4], [6, 6, 7],
];
/** non-negative 2D vectors with integer length */
const VECTORS_2D: readonly (readonly number[])[] = [
  [3, 4], [4, 3], [0, 5], [5, 0], [6, 8], [8, 6], [0, 10], [10, 0], [5, 12], [12, 5], [9, 12], [12, 9], [7, 24], [24, 7], [15, 20], [20, 15],
];
const FRUITS = ['사과', '배', '귤', '감', '포도', '딸기', '수박', '참외', '자두', '키위'];
const NAME: Record<DistanceAsk, string> = {
  euclid: '유클리드 거리',
  manhattan: '맨해튼 거리',
  chebyshev: '체비셰프 거리',
  cosine: '코사인 유사도',
  jaccard: '자카드 유사도',
};
const FALLBACKS: Record<DistanceAsk, DistanceParams> = {
  euclid: { ask: 'euclid', a: [1, 2], b: [4, 6], asSets: false },
  manhattan: { ask: 'manhattan', a: [1, 5, 2], b: [4, 3, 6], asSets: false },
  chebyshev: { ask: 'chebyshev', a: [1, 5, 2], b: [4, 3, 8], asSets: false },
  cosine: { ask: 'cosine', a: [3, 4], b: [8, 6], asSets: false },
  // |A| = |B| = 5, |A∩B| = 2 → J = 2/8 = 0.25
  jaccard: { ask: 'jaccard', a: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0], b: [0, 0, 0, 1, 1, 1, 1, 1, 0, 0], asSets: true },
};

export function solve(p: DistanceParams): DistanceSolution {
  const gaps = p.a.map((x, i) => Math.abs(x - p.b[i]));
  const dot = sum(p.a.map((x, i) => x * p.b[i]));
  const normA = Math.sqrt(sum(p.a.map(x => x * x)));
  const normB = Math.sqrt(sum(p.b.map(x => x * x)));
  const count = (x: number, y: number): number => p.a.filter((v, i) => v === x && p.b[i] === y).length;
  const [f11, f10, f01, f00] = [count(1, 1), count(1, 0), count(0, 1), count(0, 0)];
  const metrics: Record<DistanceAsk, number> = {
    euclid: Math.sqrt(sum(gaps.map(g => g * g))),
    manhattan: sum(gaps),
    chebyshev: Math.max(...gaps),
    cosine: dot / (normA * normB),
    jaccard: f11 / (f11 + f10 + f01),
  };
  return { gaps, ...metrics, dot, normA, normB, f11, f10, f01, f00, value: metrics[p.ask] };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: DistanceParams, s: DistanceSolution): number[] {
  const signedSum = Math.abs(sum(p.a.map((x, i) => x - p.b[i])));
  const squares = sum(s.gaps.map(g => g * g));
  switch (p.ask) {
    case 'euclid':
      return [s.manhattan, squares, s.chebyshev, signedSum];
    case 'manhattan':
      return [signedSum, s.euclid, s.chebyshev, squares];
    case 'chebyshev':
      // a forgotten |·| only reads as a distance while it stays positive
      return [s.manhattan, s.euclid, Math.min(...s.gaps), Math.max(...p.a.map((x, i) => x - p.b[i]))].filter(v => v > 0);
    case 'cosine': {
      // binary term vectors invite the Jaccard / SMC mix-up; real vectors the one-norm denominator
      const binary = p.a.length > 2;
      const related = binary
        ? [s.f11 / (s.f11 + s.f10 + s.f01), (s.f11 + s.f00) / p.a.length]
        : [s.dot / s.normA ** 2, s.dot / s.normB ** 2];
      return [1 - s.cosine, ...related, s.dot / (s.normA ** 2 + s.normB ** 2), s.dot]
        .filter(v => Number.isFinite(v) && v > 0 && v <= 1);
    }
    case 'jaccard': {
      const [sizeA, sizeB] = [s.f11 + s.f10, s.f11 + s.f01];
      const smc = p.asSets ? NaN : (s.f11 + s.f00) / p.a.length;
      return [(2 * s.f11) / (sizeA + sizeB), s.f11 / (sizeA + sizeB), 1 - s.jaccard, s.f11 / Math.min(sizeA, sizeB), smc]
        .filter(v => Number.isFinite(v));
    }
  }
}

function digitsFor(ask: DistanceAsk): number {
  return ask === 'cosine' || ask === 'jaccard' ? 3 : 2;
}

function isGood(p: DistanceParams): boolean {
  const s = solve(p);
  const digits = digitsFor(p.ask);
  const correct = formatNum(s.value, digits);
  const values = mistakes(p, s);
  const tidy = tidyCount(correct, values, digits, x => formatNum(x, digits));
  const others = distinctOthers(correct, values.map(x => formatNum(x, digits)));
  const minTidy = p.ask === 'cosine' || p.ask === 'jaccard' ? 2 : 3;
  const sane = p.ask === 'cosine' ? s.value > 0 && s.value < 1 : s.value > 0;
  return sane && hasDecimals(s.value, digits) && tidy >= minTidy && others >= 3;
}

function signedDiffs(rand: Rand, magnitudes: readonly number[]): number[] {
  return shuffleWith(magnitudes, rand).map(m => (rand() < 0.5 ? -m : m));
}

function binaryPair(rand: Rand, length: number, sizeA: number, sizeB: number, both: number): [number[], number[]] {
  const slots = shuffleWith(Array.from({ length }, (_, i) => i), rand);
  const inA = new Set(slots.slice(0, sizeA));
  const inB = new Set([...slots.slice(0, both), ...slots.slice(sizeA, sizeA + sizeB - both)]);
  return [Array.from({ length }, (_, i) => (inA.has(i) ? 1 : 0)), Array.from({ length }, (_, i) => (inB.has(i) ? 1 : 0))];
}

function draw(rand: Rand, ask: DistanceAsk): DistanceParams {
  if (ask === 'cosine') {
    if (rand() < 0.5) return { ask, a: [...pick(VECTORS_2D, rand)], b: [...pick(VECTORS_2D, rand)], asSets: false };
    const [a, b] = binaryPair(rand, randInt(rand, 6, 8), 4, 4, randInt(rand, 1, 3));
    return { ask, a, b, asSets: false };
  }
  if (ask === 'jaccard') {
    const sizeA = randInt(rand, 3, 5);
    const sizeB = randInt(rand, 3, 5);
    const both = randInt(rand, 1, Math.min(sizeA, sizeB) - 1);
    const [a, b] = binaryPair(rand, randInt(rand, sizeA + sizeB - both + 1, 10), sizeA, sizeB, both);
    return { ask, a, b, asSets: rand() < 0.5 };
  }
  const diffs = ask === 'euclid'
    ? signedDiffs(rand, pick(PYTHAGOREAN, rand))
    : Array.from({ length: randInt(rand, ask === 'manhattan' ? 2 : 3, 4) }, () => pick([-1, 1], rand) * randInt(rand, 1, 8));
  const a = diffs.map(() => randInt(rand, 0, 9));
  return { ask, a, b: a.map((x, i) => x + diffs[i]), asSets: false };
}

export function makeParams(rand: Rand): DistanceParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 3000);
}

function tuple(v: readonly number[]): string {
  return `(${v.join(', ')})`;
}

function itemSet(v: readonly number[]): string {
  return `{${v.map((x, i) => (x === 1 ? FRUITS[i] : '')).filter(Boolean).join(', ')}}`;
}

function prompt(p: DistanceParams): string {
  if (p.ask === 'jaccard') {
    return p.asSets
      ? `두 고객의 구매 품목 A = ${itemSet(p.a)}, B = ${itemSet(p.b)}의 자카드 유사도는?`
      : `두 이진 벡터 ${im(`x = ${tuple(p.a)}`)}, ${im(`y = ${tuple(p.b)}`)}의 자카드 유사도(Jaccard coefficient)는?`;
  }
  if (p.ask === 'cosine') {
    const lead = p.a.length > 2 ? '두 문서의 단어 출현 벡터가 ' : '두 벡터 ';
    return `${lead}${im(tex`\mathbf{a} = ${tuple(p.a)}`)}, ${im(tex`\mathbf{b} = ${tuple(p.b)}`)}일 때 코사인 유사도는?`;
  }
  return `두 점 ${im(`A${tuple(p.a)}`)}, ${im(`B${tuple(p.b)}`)} 사이의 ${NAME[p.ask]}는?`;
}

function explain(p: DistanceParams, s: DistanceSolution): string[] {
  const digits = digitsFor(p.ask);
  const v = formatNum(s.value, digits);
  const gapsLine = `좌표별 차이의 절댓값: ${im(s.gaps.join(', '))}`;
  const minkowski = '※ 민코프스키 거리에서 p = 1이 맨해튼(L1), p = 2가 유클리드(L2), p → ∞가 체비셰프(L∞)입니다.';
  switch (p.ask) {
    case 'euclid':
      return [
        gapsLine,
        im(tex`d = \sqrt{\sum (a_i - b_i)^2} = \sqrt{${s.gaps.map(g => `${g}^2`).join(' + ')}} = \sqrt{${sum(s.gaps.map(g => g * g))}} = ${v}`),
        minkowski,
      ];
    case 'manhattan':
      return [gapsLine, im(tex`d = \sum |a_i - b_i| = ${s.gaps.join(' + ')} = ${v}`), minkowski];
    case 'chebyshev':
      return [gapsLine, im(tex`d = \max_i |a_i - b_i| = \max(${s.gaps.join(', ')}) = ${v}`), minkowski];
    case 'cosine': {
      const products = p.a.map((x, i) => tex`${x} \times ${p.b[i]}`).join(' + ');
      const norm = (x: number, src: readonly number[]): string => tex`\sqrt{${sum(src.map(y => y * y))}} = ${formatNum(x)}`;
      return [
        `내적 ${im(tex`\mathbf{a} \cdot \mathbf{b} = ${products} = ${s.dot}`)}`,
        `크기 ${im(tex`\|\mathbf{a}\| = ${norm(s.normA, p.a)}`)}, ${im(tex`\|\mathbf{b}\| = ${norm(s.normB, p.b)}`)}`,
        im(tex`\cos\theta = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\|\,\|\mathbf{b}\|} = \frac{${s.dot}}{${formatNum(s.normA)} \times ${formatNum(s.normB)}} = ${v}`),
        '※ 코사인 거리 = 1 − 코사인 유사도입니다. 크기가 아니라 방향(각도)의 유사성을 봅니다.',
      ];
    }
    case 'jaccard': {
      const union = s.f11 + s.f10 + s.f01;
      const counts = p.asSets
        ? `${im(tex`|A \cap B| = ${s.f11}`)}, ${im(tex`|A \cup B| = ${union}`)}`
        : `${im(`f_{11} = ${s.f11}`)}, ${im(`f_{10} = ${s.f10}`)}, ${im(`f_{01} = ${s.f01}`)}, ${im(`f_{00} = ${s.f00}`)}`;
      const formula = p.asSets
        ? tex`J = \frac{|A \cap B|}{|A \cup B|} = \frac{${s.f11}}{${union}} = ${v}`
        : tex`J = \frac{f_{11}}{f_{11} + f_{10} + f_{01}} = \frac{${s.f11}}{${union}} = ${v}`;
      const tip = p.asSets
        ? `※ 다이스 계수 ${im(tex`\frac{2|A \cap B|}{|A| + |B|}`)}와 구분하세요. 자카드 거리 = 1 − J입니다.`
        : `※ 단순 일치 계수 SMC ${im(tex`\frac{f_{11} + f_{00}}{n}`)}는 0-0 일치까지 세지만, 자카드는 0-0을 제외합니다.`;
      return [counts, im(formula), tip];
    }
  }
}

function render(p: DistanceParams, s: DistanceSolution, rand: Rand): DrillBody {
  const digits = digitsFor(p.ask);
  const format = (x: number): string => formatNum(x, digits);
  const bounded = p.ask === 'cosine' || p.ask === 'jaccard';
  const step = bounded ? 0.05 : 1;
  const valid = (x: number): boolean => x > 0 && (!bounded || x < 1);
  const candidates = [...tidyFirst(mistakes(p, s), digits, format), ...nearby(s.value, step, format, valid)];
  const { options, answer } = uniqueOptions(format(s.value), candidates, rand, () => '');
  return { title: `거리·유사도 · ${NAME[p.ask]}`, prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const distanceGenerator = pipeline(
  { kind: 'distance', title: '거리·유사도', topic: '3.1.1.7' },
  makeParams,
  solve,
  render,
);
