/**
 * 인공신경망 — 퍼셉트론 가중합·활성화 출력, 완전연결층 파라미터 수 (출제기준 3.1.1.4 인공신경망).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { distinctOthers, im, nearby, paren, pipeline, roundTo, sampleUntil, sum, tex, withCommas, type DrillBody } from './_shared';

export type PerceptronAsk = 'step' | 'relu' | 'sigmoid' | 'params';

export type PerceptronParams =
  | { ask: 'step' | 'relu' | 'sigmoid'; x: number[]; w: number[]; b: number }
  /** node counts per layer, input first */
  | { ask: 'params'; layers: number[] };

export interface PerceptronSolution {
  /** Σ w·x without the bias */
  dot: number;
  /** z = Σ w·x + b */
  z: number;
  value: number;
}

const ASKS: readonly PerceptronAsk[] = ['step', 'relu', 'sigmoid', 'params'];
const WEIGHTS = [-1, -0.5, -0.3, -0.2, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2];
const INPUTS = [0, 1, 2, -1];
const BIASES = [-1.5, -1, -0.5, -0.2, 0.1, 0.2, 0.5, 1];
const SIG_WEIGHTS = [-1, -0.5, 0.5, 1, 1.5, 2];
const SIG_INPUTS = [0, 1, 2];
const SIG_BIASES = [-2, -1, -0.5, 0.5, 1];
/** σ(z) table printed in the prompt (2 decimals) */
const SIGMOID_TABLE = [-2, -1, 0, 1, 2];

/** σ(z) rounded to 2 decimals — the values printed in the prompt. */
export function sigmoid2(z: number): number {
  return roundTo(1 / (1 + Math.exp(-z)), 2);
}

export function paramCount(layers: readonly number[]): number {
  return sum(layers.slice(1).map((out, i) => (layers[i] + 1) * out));
}

export function solve(p: PerceptronParams): PerceptronSolution {
  if (p.ask === 'params') return { dot: 0, z: 0, value: paramCount(p.layers) };
  const dot = roundTo(sum(p.x.map((x, i) => x * p.w[i])), 4);
  const z = roundTo(dot + p.b, 4);
  const outputs: Record<'step' | 'relu' | 'sigmoid', number> = { step: z >= 0 ? 1 : 0, relu: Math.max(0, z), sigmoid: sigmoid2(z) };
  return { dot, z, value: outputs[p.ask] };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: PerceptronParams, s: PerceptronSolution): number[] {
  if (p.ask === 'params') {
    const pairs = p.layers.slice(1).map((out, i) => [p.layers[i], out] as const);
    const weightsOnly = sum(pairs.map(([a, c]) => a * c));
    return [weightsOnly, sum(pairs.map(([a, c]) => (a + 1) * (c + 1))), weightsOnly + pairs.length, sum(pairs.map(([a, c]) => a * (c + 1)))];
  }
  if (p.ask === 'step') return [1 - s.value, s.z, s.dot, -1];
  if (p.ask === 'relu') return [s.z, Math.max(0, s.dot), Math.max(0, s.dot - p.b), Math.abs(s.z), s.z + p.b];
  return [sigmoid2(s.dot), roundTo(1 - s.value, 2), 0.5, s.z];
}

function format(p: PerceptronParams, x: number): string {
  return p.ask === 'params' ? `${withCommas(x)}개` : formatNum(x, 2);
}

function isGood(p: PerceptronParams): boolean {
  const s = solve(p);
  const others = distinctOthers(format(p, s.value), mistakes(p, s).map(v => format(p, v)));
  if (p.ask === 'params') return others >= 3;
  const inTable = (z: number): boolean => Number.isInteger(z) && SIGMOID_TABLE.includes(z);
  const fits: Record<'step' | 'relu' | 'sigmoid', boolean> = {
    step: s.z !== 0,
    relu: s.z !== 0,
    sigmoid: inTable(s.z) && inTable(s.dot) && s.dot !== s.z,
  };
  return fits[p.ask] && p.x.some(x => x !== 0) && others >= 3;
}

function layersFor(rand: Rand): number[] {
  const shape = pick(['dense', 'mlp', 'mlp', 'deep'] as const, rand);
  if (shape === 'dense') {
    const inputs = pick([8, 10, 16, 20, 32, 64, 100, 784], rand);
    return [inputs, pick(inputs === 784 ? [1, 2, 10] : [1, 2, 4, 8, 10, 16, 32], rand)];
  }
  if (shape === 'mlp') return [randInt(rand, 2, 10), pick([3, 4, 5, 6, 8, 10, 16], rand), pick([1, 2, 3, 4, 10], rand)];
  return [pick([4, 8, 10], rand), pick([8, 16], rand), pick([4, 8], rand), pick([1, 2, 3], rand)];
}

function draw(rand: Rand, ask: PerceptronAsk): PerceptronParams {
  if (ask === 'params') return { ask, layers: layersFor(rand) };
  const sig = ask === 'sigmoid';
  const x = Array.from({ length: 3 }, () => pick(sig ? SIG_INPUTS : INPUTS, rand));
  const w = Array.from({ length: 3 }, () => pick(sig ? SIG_WEIGHTS : WEIGHTS, rand));
  return { ask, x, w, b: pick(sig ? SIG_BIASES : BIASES, rand) };
}

const FALLBACKS: Record<PerceptronAsk, PerceptronParams> = {
  step: { ask: 'step', x: [1, 0, 2], w: [0.5, -1, 0.3], b: -0.2 },
  relu: { ask: 'relu', x: [1, 2, 1], w: [0.5, -1, 0.3], b: -0.2 },
  sigmoid: { ask: 'sigmoid', x: [1, 2, 0], w: [1, 0.5, -1], b: -1 },
  params: { ask: 'params', layers: [4, 5, 3] },
};

export function makeParams(rand: Rand): PerceptronParams {
  const ask = pick(ASKS, rand);
  // Half of the ReLU items have z < 0, so "forgot to clip at 0" is a live mistake.
  const wantNegative = rand() < 0.5;
  const accept = (p: PerceptronParams): boolean => isGood(p) && (p.ask !== 'relu' || (solve(p).z < 0) === wantNegative);
  return sampleUntil(rand, r => draw(r, ask), accept, FALLBACKS[ask], 2000);
}

const ACTIVATION: Record<'step' | 'relu' | 'sigmoid', string> = {
  step: `계단 함수: ${im(tex`z \ge 0`)}이면 1, 아니면 0`,
  relu: `ReLU: ${im(tex`f(z) = \max(0, z)`)}`,
  sigmoid: `시그모이드: ${im(tex`\sigma(z) = \frac{1}{1 + e^{-z}}`)}`,
};

function weightedSumTex(x: readonly number[], w: readonly number[], b: number, z: number): string {
  const terms = x.map((xi, i) => tex`${paren(w[i])} \times ${paren(xi)}`).join(' + ');
  return tex`z = \sum w_i x_i + b = ${terms} + ${paren(b)} = ${formatNum(z, 2)}`;
}

function layerTerms(layers: readonly number[]): string {
  return layers.slice(1).map((out, i) => tex`(${layers[i]} + 1) \times ${out}`).join(' + ');
}

function prompt(p: PerceptronParams): string {
  if (p.ask === 'params') {
    const [first, ...rest] = p.layers;
    if (rest.length === 1) {
      return `입력 특성이 ${first}개인 데이터에 출력 노드 ${rest[0]}개의 완전연결층(Dense)을 적용했다. 이 층의 학습 파라미터 수(가중치 + 편향)는?`;
    }
    const hidden = rest.slice(0, -1).map(n => `${n}개`).join('·');
    return `입력층 ${first}개, 은닉층 ${hidden}, 출력층 ${rest[rest.length - 1]}개 노드로 이루어진 완전연결 신경망(MLP)의 `
      + '전체 학습 파라미터 수(가중치 + 편향)는?';
  }
  const vec = (v: readonly number[]): string => `(${v.map(n => formatNum(n)).join(', ')})`;
  const table = p.ask === 'sigmoid'
    ? `\n(단, ${SIGMOID_TABLE.map(z => im(tex`\sigma(${z}) = ${formatNum(sigmoid2(z))}`)).join(', ')})`
    : '';
  return `입력 ${im(tex`\mathbf{x} = ${vec(p.x)}`)}, 가중치 ${im(tex`\mathbf{w} = ${vec(p.w)}`)}, 편향 ${im(`b = ${formatNum(p.b)}`)}인 `
    + `퍼셉트론의 출력값은?\n(활성화 함수 — ${ACTIVATION[p.ask]})${table}`;
}

function explain(p: PerceptronParams, s: PerceptronSolution): string[] {
  if (p.ask === 'params') {
    const parts = p.layers.slice(1).map((out, i) => (p.layers[i] + 1) * out);
    const subtotal = parts.length > 1 ? ` = ${parts.join(' + ')}` : '';
    return [
      '완전연결층의 파라미터 = (입력 노드 수 + 1) × 출력 노드 수 (+1은 출력 노드마다 하나씩인 편향)',
      im(tex`${layerTerms(p.layers)}${subtotal} = ${s.value}`),
      '※ 편향을 빼먹거나(가중치만 계산) 입력층에도 편향을 붙이는 실수에 주의합니다.',
    ];
  }
  const z = formatNum(s.z, 2);
  const outputLine: Record<'step' | 'relu' | 'sigmoid', string> = {
    step: `${im(`z = ${z}`)} ${s.z >= 0 ? '≥ 0' : '< 0'}이므로 계단 함수 출력은 ${s.value}`,
    relu: `ReLU: ${im(tex`\max(0, ${z}) = ${formatNum(s.value, 2)}`)}`,
    sigmoid: `시그모이드: ${im(tex`\sigma(${z}) = ${formatNum(s.value, 2)}`)}`,
  };
  return [
    `가중합: ${im(weightedSumTex(p.x, p.w, p.b, s.z))}`,
    outputLine[p.ask],
    '※ 편향 b를 더하는 것을 잊거나 활성화 함수를 적용하지 않은 z를 답으로 고르지 않기.',
  ];
}

const TITLE: Record<PerceptronAsk, string> = {
  step: '퍼셉트론 · 계단 함수',
  relu: '퍼셉트론 · ReLU',
  sigmoid: '퍼셉트론 · 시그모이드',
  params: '신경망 · 파라미터 수',
};

function render(p: PerceptronParams, s: PerceptronSolution, rand: Rand): DrillBody {
  const fmt = (x: number): string => format(p, x);
  const step = p.ask === 'params' ? 10 : 0.5;
  const valid = (x: number): boolean => (p.ask === 'params' ? x > 0 : p.ask === 'sigmoid' ? x > 0 && x < 1 : true);
  const candidates = [...mistakes(p, s).map(fmt), ...nearby(s.value, step, fmt, valid)];
  const { options, answer } = uniqueOptions(fmt(s.value), candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const perceptronGenerator = pipeline(
  { kind: 'perceptron', title: '퍼셉트론·파라미터 수', topic: '3.1.1.4' },
  makeParams,
  solve,
  render,
);
