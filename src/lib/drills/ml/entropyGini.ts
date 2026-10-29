/**
 * 의사결정나무 불순도 — 엔트로피·지니 지수·정보이득 (출제기준 3.1.1.3 의사결정나무).
 * Entropy items use dyadic proportions (1/2, 1/4, 1/8) so every log2 is an integer.
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { distinctOthers, hasDecimals, im, nearby, pipeline, sampleUntil, sum, tex, texFrac, type DrillBody } from './_shared';

export type EntropyGiniAsk = 'entropy' | 'gini' | 'ig' | 'child';

/** One node's class counts. */
export interface NodeParams {
  ask: 'entropy' | 'gini';
  counts: number[];
}

/** A binary split: parent = left + right (class-wise); 'child' asks the weighted child entropy. */
export interface SplitParams {
  ask: 'ig' | 'child';
  left: number[];
  right: number[];
}

export type EntropyGiniParams = NodeParams | SplitParams;

function isSplit(p: EntropyGiniParams): p is SplitParams {
  return p.ask === 'ig' || p.ask === 'child';
}

export interface EntropyGiniSolution {
  value: number;
  /** of `counts`, or of the parent node */
  entropy: number;
  gini: number;
  leftEntropy: number;
  rightEntropy: number;
  /** size-weighted mean of the child entropies */
  weighted: number;
  gain: number;
}

const ASKS: readonly EntropyGiniAsk[] = ['entropy', 'gini', 'ig', 'child'];
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Class counts with dyadic proportions (totals 8 or 16). */
export const ENTROPY_BASES: readonly (readonly number[])[] = [
  [4, 4], [4, 2, 2], [2, 2, 2, 2], [4, 2, 1, 1], [2, 2, 1, 1, 1, 1],
  [8, 2, 2, 2, 2], [4, 4, 2, 2, 2, 2], [8, 4, 2, 1, 1],
];

/** Splits into equal-size children with dyadic proportions everywhere (IG ∈ {0, 0.25, 0.5, 1}). */
export const SPLITS: readonly (readonly [readonly number[], readonly number[]])[] = [
  [[4, 0], [0, 4]], [[2, 2], [2, 2]], [[4, 0, 0], [0, 2, 2]], [[2, 2, 0], [2, 0, 2]],
  [[2, 2, 0, 0], [0, 0, 2, 2]], [[4, 0, 0, 0], [0, 2, 1, 1]], [[2, 2, 0, 0], [2, 0, 1, 1]],
  [[2, 1, 1, 0], [2, 1, 0, 1]], [[2, 1, 1, 0], [0, 1, 1, 2]], [[4, 4, 0], [0, 0, 8]],
  [[0, 0, 0, 8], [2, 2, 4, 0]], [[0, 0, 4, 4], [2, 2, 0, 4]], [[4, 2, 2, 0], [0, 2, 2, 4]],
];

const GINI_TOTALS = [4, 5, 10, 10, 20];
const GINI_FALLBACK = [6, 4];

/** H = Σ p·log2(1/p) over non-empty classes; a pure node is +0 (never -0). */
export function entropy(counts: readonly number[]): number {
  const total = sum(counts);
  return sum(counts.filter(c => c > 0).map(c => (c / total) * Math.log2(total / c)));
}

export function gini(counts: readonly number[]): number {
  const total = sum(counts);
  return 1 - sum(counts.map(c => (c / total) ** 2));
}

function parentOf(left: readonly number[], right: readonly number[]): number[] {
  return left.map((c, i) => c + right[i]);
}

export function solve(p: EntropyGiniParams): EntropyGiniSolution {
  if (!isSplit(p)) {
    const h = entropy(p.counts);
    const g = gini(p.counts);
    return { value: p.ask === 'entropy' ? h : g, entropy: h, gini: g, leftEntropy: 0, rightEntropy: 0, weighted: 0, gain: 0 };
  }
  const parent = parentOf(p.left, p.right);
  const n = sum(parent);
  const leftEntropy = entropy(p.left);
  const rightEntropy = entropy(p.right);
  const weighted = (sum(p.left) / n) * leftEntropy + (sum(p.right) / n) * rightEntropy;
  const h = entropy(parent);
  const gain = h - weighted;
  return { value: p.ask === 'ig' ? gain : weighted, entropy: h, gini: gini(parent), leftEntropy, rightEntropy, weighted, gain };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: EntropyGiniParams, s: EntropyGiniSolution): number[] {
  switch (p.ask) {
    case 'entropy': {
      const total = sum(p.counts);
      const present = p.counts.filter(c => c > 0);
      // last: Σ −log2 p without the p weights (entropy is never negative, so no sign-flip option)
      return [s.gini, Math.log2(present.length), s.entropy * Math.LN2, sum(present.map(c => Math.log2(total / c)))];
    }
    case 'gini': {
      const total = sum(p.counts);
      return [1 - s.gini, 1 - Math.max(...p.counts) / total, s.entropy];
    }
    case 'ig':
      return [s.weighted, s.entropy - s.leftEntropy - s.rightEntropy, s.entropy, s.entropy - Math.min(s.leftEntropy, s.rightEntropy)]
        .filter(v => v >= 0);
    case 'child':
      return [s.gain, s.leftEntropy + s.rightEntropy, s.entropy, Math.max(s.leftEntropy, s.rightEntropy)];
  }
}

function composition(rand: Rand, total: number, parts: number): number[] {
  const cuts = Array.from({ length: parts - 1 }, () => randInt(rand, 1, total - 1)).sort((a, b) => a - b);
  if (new Set(cuts).size !== cuts.length) return [];
  return [...cuts, total].map((c, i) => c - (i === 0 ? 0 : cuts[i - 1]));
}

function draw(rand: Rand, ask: EntropyGiniAsk): EntropyGiniParams {
  if (ask === 'entropy') {
    const base = pick(ENTROPY_BASES, rand);
    const scale = sum(base) === 8 && rand() < 0.5 ? 2 : 1;
    return { ask, counts: shuffleWith(base, rand).map(c => c * scale) };
  }
  if (ask === 'gini') {
    const total = pick(GINI_TOTALS, rand);
    return { ask, counts: composition(rand, total, randInt(rand, 2, Math.min(4, total - 1))) };
  }
  const [left, right] = rand() < 0.5 ? pick(SPLITS, rand) : [...pick(SPLITS, rand)].reverse();
  const order = shuffleWith(left.map((_, i) => i), rand);
  const scale = sum(left) + sum(right) === 8 && rand() < 0.5 ? 2 : 1;
  return { ask, left: order.map(i => left[i] * scale), right: order.map(i => right[i] * scale) };
}

function isGood(p: EntropyGiniParams): boolean {
  if (p.ask === 'gini' && p.counts.length < 2) return false;
  const s = solve(p);
  return hasDecimals(s.value, 3) && distinctOthers(formatNum(s.value), mistakes(p, s).map(v => formatNum(v))) >= 3;
}

export function makeParams(rand: Rand): EntropyGiniParams {
  const ask = pick(ASKS, rand);
  const fallback: EntropyGiniParams = ask === 'entropy' || ask === 'gini'
    ? { ask, counts: ask === 'gini' ? GINI_FALLBACK : [...ENTROPY_BASES[1]] }
    : { ask, left: [...SPLITS[2][0]], right: [...SPLITS[2][1]] };
  return sampleUntil(rand, r => draw(r, ask), isGood, fallback, 500);
}

function countsText(counts: readonly number[]): string {
  return counts.map((c, i) => (c > 0 ? `${LABELS[i]} ${c}개` : '')).filter(Boolean).join(', ');
}

/** `label = −Σ p·log2 p = value`, written with integer −log2 p (dyadic counts only); pure nodes are 0. */
function entropyLine(label: string, counts: readonly number[]): string {
  const total = sum(counts);
  const nonZero = counts.filter(c => c > 0);
  if (nonZero.length === 1) return `${im(`${label} = 0`)} (순수 노드)`;
  const terms = nonZero.map(c => tex`${texFrac(c, total)} \times ${formatNum(Math.log2(total / c))}`).join(' + ');
  return im(`${label} = ${terms} = ${formatNum(entropy(counts))}`);
}

function giniTex(counts: readonly number[]): string {
  const total = sum(counts);
  const squares = counts.map(c => `${c}^2`).join(' + ');
  const sq = sum(counts.map(c => c * c));
  return tex`Gini = 1 - \sum p_i^2 = 1 - \frac{${squares}}{${total}^2} = 1 - \frac{${sq}}{${total * total}} = ${formatNum(gini(counts))}`;
}

const LOG_NOTE = `비율별 ${im(tex`-\log_2 p`)}: ${im(tex`\frac{1}{2} \to 1`)}, ${im(tex`\frac{1}{4} \to 2`)}, ${im(tex`\frac{1}{8} \to 3`)}`;

function explainNode(p: NodeParams): string[] {
  if (p.ask === 'gini') {
    return [
      im(giniTex(p.counts)),
      `※ 지니 지수는 0(순수 노드)에서 최대 ${im(tex`1 - \frac{1}{k}`)}입니다. ${im(tex`\sum p_i^2`)}에서 멈추거나 오분류율(1 − 최대 비율)과 헷갈리지 마세요.`,
    ];
  }
  return [
    LOG_NOTE,
    `${im(tex`H = -\sum p_i \log_2 p_i`)}: ${entropyLine('H', p.counts)}`,
    `※ 엔트로피는 한 클래스만 있으면 0, k개 클래스가 고르게 섞이면 최댓값 ${im(tex`\log_2 k`)}입니다. 지니 지수 ${im(tex`1 - \sum p_i^2`)}와 구분하세요.`,
  ];
}

function explain(p: EntropyGiniParams, s: EntropyGiniSolution): string[] {
  if (!isSplit(p)) return explainNode(p);
  const v = formatNum(s.value);
  const parent = parentOf(p.left, p.right);
  const [n, nL, nR] = [sum(parent), sum(p.left), sum(p.right)];
  const [h, hL, hR, w] = [s.entropy, s.leftEntropy, s.rightEntropy, s.weighted].map(x => formatNum(x));
  const lines = [
    LOG_NOTE,
    `부모(${n}개): ${entropyLine('H', parent)}`,
    `왼쪽(${nL}개): ${entropyLine('H_L', p.left)}, 오른쪽(${nR}개): ${entropyLine('H_R', p.right)}`,
    `분할 후 가중 평균: ${im(tex`\frac{${nL}}{${n}} \times ${hL} + \frac{${nR}}{${n}} \times ${hR} = ${w}`)}`,
  ];
  if (p.ask === 'ig') {
    return [
      ...lines,
      `정보이득: ${im(tex`IG = H - (\text{가중 평균}) = ${h} - ${w} = ${v}`)}`,
      '※ 정보이득은 분할로 줄어든 불확실성입니다. 자식 엔트로피는 표본 수 비율로 가중 평균해야 합니다.',
    ];
  }
  return [...lines, '※ 자식 노드 엔트로피를 단순 합하지 말고 표본 수 비율로 가중 평균합니다. (정보이득 = 부모 − 가중 평균)'];
}

function prompt(p: EntropyGiniParams): string {
  const logHint = '(로그의 밑은 2)';
  if (!isSplit(p)) {
    const node = `의사결정나무의 한 노드에 ${countsText(p.counts)}가 있다.`;
    return p.ask === 'entropy' ? `${node} 이 노드의 엔트로피는? ${logHint}` : `${node} 이 노드의 지니 지수(Gini impurity)는?`;
  }
  const split = `부모 노드(${countsText(parentOf(p.left, p.right))})를 분할해 `
    + `왼쪽 자식(${countsText(p.left)})과 오른쪽 자식(${countsText(p.right)})을 얻었다.`;
  return p.ask === 'ig'
    ? `${split} 엔트로피 기준 정보이득(Information Gain)은? ${logHint}`
    : `${split} 분할 후 자식 노드들의 가중 평균 엔트로피는? ${logHint}`;
}

const TITLE: Record<EntropyGiniAsk, string> = {
  entropy: '의사결정나무 · 엔트로피',
  gini: '의사결정나무 · 지니 지수',
  ig: '의사결정나무 · 정보이득',
  child: '의사결정나무 · 분할 후 엔트로피',
};

function render(p: EntropyGiniParams, s: EntropyGiniSolution, rand: Rand): DrillBody {
  const format = (x: number): string => formatNum(x);
  const step = p.ask === 'gini' ? 0.04 : 0.25;
  const candidates = [...mistakes(p, s).map(format), ...nearby(s.value, step, format, x => x >= 0)];
  const { options, answer } = uniqueOptions(format(s.value), candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const entropyGiniGenerator = pipeline(
  { kind: 'entropy-gini', title: '엔트로피·지니·정보이득', topic: '3.1.1.3' },
  makeParams,
  solve,
  render,
);
