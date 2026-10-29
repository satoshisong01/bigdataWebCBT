/**
 * CNN — 합성곱·풀링 출력 크기 (W − F + 2P)/S + 1, 합성곱층 파라미터 수 (출제기준 3.1.2.5 딥러닝 분석).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, type Rand } from '@/lib/rng';
import { uniqueOptions } from '../util';
import { distinctOthers, im, pipeline, sampleUntil, tex, withCommas, type DrillBody } from './_shared';

export type CnnAsk = 'conv' | 'pool' | 'params' | 'stack';

export interface CnnParams {
  ask: CnnAsk;
  /** input width (= height) */
  size: number;
  /** input channels */
  channels: number;
  /** filter or pooling window size F */
  kernel: number;
  stride: number;
  padding: number;
  /** number of conv filters K (output channels) */
  filters: number;
}

export interface CnnSolution {
  /** spatial size after the conv / pooling layer */
  out: number;
  /** after the 2×2, stride-2 max pooling ('stack') */
  pooled: number;
  /** output channels */
  depth: number;
  /** (F·F·C + 1)·K */
  params: number;
}

/** [spatial size, depth] */
type Shape = readonly [number, number];

const ASKS: readonly CnnAsk[] = ['conv', 'pool', 'params', 'stack'];
const FALLBACKS: Record<CnnAsk, CnnParams> = {
  conv: { ask: 'conv', size: 32, channels: 3, kernel: 5, stride: 1, padding: 0, filters: 16 },
  pool: { ask: 'pool', size: 28, channels: 16, kernel: 2, stride: 2, padding: 0, filters: 0 },
  params: { ask: 'params', size: 32, channels: 3, kernel: 3, stride: 1, padding: 1, filters: 16 },
  stack: { ask: 'stack', size: 32, channels: 3, kernel: 5, stride: 1, padding: 0, filters: 6 },
};

export function solve(p: CnnParams): CnnSolution {
  const out = p.ask === 'pool'
    ? (p.size - p.kernel) / p.stride + 1
    : (p.size - p.kernel + 2 * p.padding) / p.stride + 1;
  return {
    out,
    pooled: (out - 2) / 2 + 1,
    depth: p.ask === 'pool' ? p.channels : p.filters,
    params: (p.kernel * p.kernel * p.channels + 1) * p.filters,
  };
}

function shapeText([size, depth]: Shape): string {
  return `${size}×${size}×${depth}`;
}

function answerShape(p: CnnParams, s: CnnSolution): Shape {
  return [p.ask === 'stack' ? s.pooled : s.out, s.depth];
}

/** Shapes the classic mistakes produce, most plausible first (integers only). */
function shapeMistakes(p: CnnParams, s: CnnSolution): Shape[] {
  const { size: w, kernel: f, padding: pad, stride: st, channels: c, filters: k } = p;
  const whole = (x: number): boolean => Number.isInteger(x) && x > 0;
  const keep = (list: (Shape | null)[]): Shape[] => list.filter((x): x is Shape => x !== null && whole(x[0]) && whole(x[1]));
  if (p.ask === 'conv') {
    return keep([
      [s.out - 1, k],
      [s.out, c],
      pad > 0 ? [(w - f) / st + 1, k] : null,
      pad > 0 ? [(w - f + pad) / st + 1, k] : null,
      st > 1 ? [w - f + 2 * pad + 1, k] : null,
      [w, k],
    ]);
  }
  if (p.ask === 'pool') return keep([[s.out - 1, c], [w - f + 1, c], [s.out, c / 2], [w, c]]);
  return keep([[s.out, k], [w / 2, k], [s.pooled, c], [s.pooled - 1, k]]);
}

function paramMistakes(p: CnnParams): number[] {
  const { kernel: f, channels: c, filters: k } = p;
  return [f * f * c * k, (f * f + 1) * k, (f * f * k + 1) * c, f * f * c + k];
}

function texts(p: CnnParams, s: CnnSolution): { correct: string; candidates: string[] } {
  if (p.ask === 'params') {
    const fmt = (x: number): string => `${withCommas(x)}개`;
    return { correct: fmt(s.params), candidates: [...paramMistakes(p), s.params + p.filters, s.params - 1].map(fmt) };
  }
  const [size, depth] = answerShape(p, s);
  const pads: Shape[] = [[size + 1, depth], [size - 1, depth], [size + 2, depth], [size * 2, depth]];
  return { correct: shapeText([size, depth]), candidates: [...shapeMistakes(p, s), ...pads.filter(([n]) => n > 0)].map(shapeText) };
}

function isGood(p: CnnParams): boolean {
  const s = solve(p);
  const whole = (x: number): boolean => Number.isInteger(x) && x >= 2;
  const shapeOk = p.ask === 'params' || (whole(s.out) && (p.ask !== 'stack' || whole(s.pooled)));
  const sane = p.kernel <= p.size && p.padding < p.kernel && (p.ask !== 'params' || p.kernel ** 2 * p.channels <= 160);
  const { correct, candidates } = texts(p, s);
  return shapeOk && sane && distinctOthers(correct, candidates.slice(0, 4)) >= 3;
}

function draw(rand: Rand, ask: CnnAsk): CnnParams {
  if (ask === 'pool') {
    const [kernel, stride] = pick([[2, 2], [2, 2], [3, 2], [3, 3], [2, 1]] as const, rand);
    const size = pick([8, 12, 16, 24, 28, 32, 55, 56, 64, 112, 224], rand);
    return { ask, size, channels: pick([3, 16, 32, 64, 96], rand), kernel, stride, padding: 0, filters: 0 };
  }
  if (ask === 'params') {
    return { ask, size: 32, channels: pick([1, 3, 8, 16, 32], rand), kernel: pick([1, 3, 3, 5], rand), stride: 1, padding: 0, filters: pick([4, 6, 8, 10, 16, 32, 64], rand) };
  }
  if (ask === 'stack') {
    return { ask, size: pick([28, 32, 64], rand), channels: pick([1, 3], rand), kernel: pick([3, 5], rand), stride: 1, padding: pick([0, 1, 2], rand), filters: pick([6, 8, 16, 32], rand) };
  }
  const size = pick([5, 6, 7, 8, 10, 12, 28, 32, 64, 224, 227], rand);
  const stride = pick(size >= 64 ? [1, 2, 4] : [1, 1, 2], rand);
  return {
    ask,
    size,
    channels: pick([1, 3, 16, 32, 64], rand),
    kernel: pick(size >= 64 ? [3, 5, 7, 11] : [1, 2, 3, 3, 5], rand),
    stride,
    padding: pick([0, 0, 1, 2, 3], rand),
    filters: pick([6, 8, 16, 32, 64, 96], rand),
  };
}

export function makeParams(rand: Rand): CnnParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 2000);
}

function convTex(p: CnnParams, out: number): string {
  return tex`O = \frac{W - F + 2P}{S} + 1 = \frac{${p.size} - ${p.kernel} + 2 \times ${p.padding}}{${p.stride}} + 1 = ${out}`;
}

function poolTex(size: number, kernel: number, stride: number, out: number): string {
  return tex`O = \frac{W - F}{S} + 1 = \frac{${size} - ${kernel}}{${stride}} + 1 = ${out}`;
}

function cube(size: number, depth: number): string {
  return im(tex`${size} \times ${size} \times ${depth}`);
}

function prompt(p: CnnParams): string {
  const input = cube(p.size, p.channels);
  const conv = `${im(tex`${p.kernel} \times ${p.kernel}`)} 필터 ${p.filters}개, stride ${p.stride}, padding ${p.padding}`;
  switch (p.ask) {
    case 'conv':
      return `입력 ${input}에 합성곱(${conv})을 적용하면 출력 특성맵의 크기(가로×세로×채널)는?`;
    case 'pool':
      return `${input} 특성맵에 ${im(tex`${p.kernel} \times ${p.kernel}`)} 최대 풀링(stride ${p.stride})을 적용하면 출력 크기는?`;
    case 'params':
      return `입력 채널이 ${p.channels}개인 특성맵에 ${im(tex`${p.kernel} \times ${p.kernel}`)} 필터 ${p.filters}개를 쓰는 `
        + '합성곱층의 학습 파라미터 수(가중치 + 편향)는?';
    case 'stack':
      return `입력 ${input} → 합성곱(${conv}) → 최대 풀링(${im(tex`2 \times 2`)}, stride 2)을 거친 출력 크기는?`;
  }
}

function explain(p: CnnParams, s: CnnSolution): string[] {
  const depthTip = '※ 합성곱 출력의 채널 수는 입력 채널이 아니라 필터 개수입니다. 패딩은 양쪽이라 2P, 마지막 +1을 빼먹지 않기.';
  switch (p.ask) {
    case 'conv':
      return [im(convTex(p, s.out)), `채널 = 필터 개수 ${p.filters} → ${cube(s.out, s.depth)}`, depthTip];
    case 'pool':
      return [
        im(poolTex(p.size, p.kernel, p.stride, s.out)),
        `풀링은 채널마다 따로 적용되므로 채널 수(${p.channels}개)는 그대로 → ${cube(s.out, s.depth)}`,
        '※ 풀링층에는 학습 파라미터가 없고, 가로·세로만 줄어듭니다.',
      ];
    case 'params': {
      const perFilter = p.kernel * p.kernel * p.channels;
      return [
        '필터 하나의 가중치 = F × F × 입력 채널, 필터마다 편향 1개',
        im(tex`(F \times F \times C_{in} + 1) \times K = (${p.kernel} \times ${p.kernel} \times ${p.channels} + 1) \times ${p.filters} = ${perFilter + 1} \times ${p.filters} = ${s.params}`),
        '※ 편향을 빼먹거나 입력 채널 수를 곱하지 않는 실수에 주의합니다.',
      ];
    }
    case 'stack':
      return [
        `합성곱: ${im(convTex(p, s.out))} → ${cube(s.out, p.filters)}`,
        `풀링: ${im(poolTex(s.out, 2, 2, s.pooled))} → ${cube(s.pooled, p.filters)}`,
        depthTip,
      ];
  }
}

const TITLE: Record<CnnAsk, string> = {
  conv: 'CNN · 합성곱 출력 크기',
  pool: 'CNN · 풀링 출력 크기',
  params: 'CNN · 합성곱 파라미터 수',
  stack: 'CNN · 합성곱 → 풀링',
};

function render(p: CnnParams, s: CnnSolution, rand: Rand): DrillBody {
  const { correct, candidates } = texts(p, s);
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const cnnShapeGenerator = pipeline(
  { kind: 'cnn-shape', title: 'CNN 출력 크기', topic: '3.1.2.5' },
  makeParams,
  solve,
  render,
);
