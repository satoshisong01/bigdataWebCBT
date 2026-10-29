/**
 * 로지스틱 회귀 — 오즈·오즈비·예측 확률 (출제기준 3.1.1.2 로지스틱 회귀분석). e^β values are given.
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, distinctOthers, hasDecimals, im, nearby, pipeline, sampleUntil, signed, tex, texTable, tidyCount, tidyFirst,
  type DrillBody,
} from './_shared';

export type OddsAsk = 'coef' | 'prob-to-odds' | 'logit' | 'table';

/** A coefficient whose e^β is printed in the prompt. */
export interface ExpPair {
  beta: number;
  exp: number;
}

export type OddsParams =
  /** odds multiplier when x_(target+1) grows by delta */
  | { ask: 'coef'; intercept: number; betas: readonly [ExpPair, ExpPair]; target: 0 | 1; delta: number }
  | { ask: 'prob-to-odds'; prob: number }
  /** logit = (b0Units + b1Units·x)·ln 2, so e^logit is a power of 2 (e^0.693 = 2 given) */
  | { ask: 'logit'; b0Units: number; b1Units: number; x: number }
  /** 2×2 table: exposed (a: event, b: none), unexposed (c: event, d: none) */
  | { ask: 'table'; a: number; b: number; c: number; d: number };

export interface OddsSolution {
  value: number;
}

const ASKS: readonly OddsAsk[] = ['coef', 'prob-to-odds', 'logit', 'table'];
const LN2 = 0.693;
export const EXP_PAIRS: readonly ExpPair[] = [
  { beta: 0.693, exp: 2 }, { beta: 1.099, exp: 3 }, { beta: 1.386, exp: 4 }, { beta: 1.609, exp: 5 },
  { beta: 0.405, exp: 1.5 }, { beta: 0.182, exp: 1.2 }, { beta: -0.693, exp: 0.5 }, { beta: -0.223, exp: 0.8 },
  { beta: -0.357, exp: 0.7 }, { beta: 2.303, exp: 10 },
];
const INTERCEPTS = [-2.5, -1.2, -0.8, 0.5, 1.3, -3.1];
const PROBS = [0.1, 0.2, 0.25, 0.4, 0.6, 0.75, 0.8, 0.9];
const TABLE_FALLBACK: OddsParams = { ask: 'table', a: 30, b: 20, c: 20, d: 40 };

export function solve(p: OddsParams): OddsSolution {
  switch (p.ask) {
    case 'coef':
      return { value: p.betas[p.target].exp ** p.delta };
    case 'prob-to-odds':
      return { value: p.prob / (1 - p.prob) };
    case 'logit': {
      const odds = 2 ** (p.b0Units + p.b1Units * p.x);
      return { value: odds / (1 + odds) };
    }
    case 'table':
      return { value: (p.a * p.d) / (p.b * p.c) };
  }
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: OddsParams, s: OddsSolution): number[] {
  switch (p.ask) {
    case 'coef': {
      const own = p.betas[p.target];
      const other = p.betas[1 - p.target];
      const third = p.delta === 1 ? own.exp - 1 : p.delta * own.exp;
      return [other.exp ** p.delta, own.beta * p.delta, third, 1 / s.value].filter(v => v > 0);
    }
    case 'prob-to-odds':
      return [(1 - p.prob) / p.prob, p.prob, p.prob / (1 + p.prob), 1 / (1 - p.prob)];
    case 'logit': {
      const m = p.b0Units + p.b1Units * p.x;
      const z = m * LN2;
      return [1 - s.value, 2 ** m, 0.5, ...(z > 0 && z < 1 ? [z] : [])];
    }
    case 'table': {
      const rr = (p.a / (p.a + p.b)) / (p.c / (p.c + p.d));
      return [rr, 1 / s.value, p.a / p.c, (p.a * p.b) / (p.c * p.d)];
    }
  }
}

function isGood(p: OddsParams): boolean {
  const s = solve(p);
  const correct = formatNum(s.value);
  if (p.ask === 'table') {
    // The story is smoking vs. lung disease, so keep the exposure harmful (OR > 1).
    const inRange = s.value > 1 && s.value <= 10;
    return inRange && hasDecimals(s.value, 2) && tidyCount(correct, mistakes(p, s), 3) >= 3;
  }
  if (p.ask === 'logit' && p.b0Units === 0) return false;
  return distinctOthers(correct, mistakes(p, s).map(v => formatNum(v))) >= 3;
}

function draw(rand: Rand, ask: OddsAsk): OddsParams {
  switch (ask) {
    case 'coef': {
      const first = pick(EXP_PAIRS, rand);
      const second = pick(EXP_PAIRS.filter(e => e.exp !== first.exp), rand);
      return { ask, intercept: pick(INTERCEPTS, rand), betas: [first, second], target: rand() < 0.5 ? 0 : 1, delta: pick([1, 2], rand) };
    }
    case 'prob-to-odds':
      return { ask, prob: pick(PROBS, rand) };
    case 'logit': {
      const b1Units = pick([1, 2, -1], rand);
      const x = randInt(rand, 1, 4);
      const m = pick([-2, -1, 1, 2, 3], rand);
      return { ask, b0Units: m - b1Units * x, b1Units, x };
    }
    case 'table':
      return { ask, a: 5 * randInt(rand, 1, 12), b: 5 * randInt(rand, 2, 18), c: 5 * randInt(rand, 1, 12), d: 5 * randInt(rand, 2, 18) };
  }
}

const FALLBACKS: Record<OddsAsk, OddsParams> = {
  coef: { ask: 'coef', intercept: -1.2, betas: [EXP_PAIRS[0], EXP_PAIRS[1]], target: 1, delta: 2 },
  'prob-to-odds': { ask: 'prob-to-odds', prob: 0.8 },
  logit: { ask: 'logit', b0Units: -2, b1Units: 1, x: 3 },
  table: TABLE_FALLBACK,
};

export function makeParams(rand: Rand): OddsParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 3000);
}

function prompt(p: OddsParams): string {
  switch (p.ask) {
    case 'coef': {
      const [b1, b2] = p.betas;
      const model = tex`\ln\frac{p}{1-p} = ${formatNum(p.intercept)} ${signed(b1.beta)}x_1 ${signed(b2.beta)}x_2`;
      const given = p.betas.map(e => im(tex`e^{${formatNum(e.beta)}} = ${formatNum(e.exp)}`)).join(', ');
      return `다음 로지스틱 회귀모형에서 다른 변수가 고정일 때 변수 ${im(`x_${p.target + 1}`)}의 값이 ${p.delta}만큼 증가하면 `
        + `오즈(odds)는 몇 배가 되는가?\n${block(model)}\n(단, ${given})`;
    }
    case 'prob-to-odds':
      return `로지스틱 회귀모형이 예측한 어떤 고객의 이탈 확률은 ${im(`p = ${formatNum(p.prob)}`)}이다. 이 고객의 이탈 오즈(odds)는?`;
    case 'logit': {
      const model = tex`\ln\frac{p}{1-p} = ${formatNum(p.b0Units * LN2)} ${signed(p.b1Units * LN2)}x`;
      return `로지스틱 회귀모형 ${im(model)}에서 ${im(`x = ${p.x}`)}일 때 예측 확률 ${im('p')}는? `
        + `(단, ${im(tex`e^{0.693} = 2`)})`;
    }
    case 'table': {
      const table = texTable('c|cc', [
        ['', tex`\text{질환 있음}`, tex`\text{질환 없음}`],
        [tex`\text{흡연}`, p.a, p.b],
        [tex`\text{비흡연}`, p.c, p.d],
      ]);
      return `흡연 여부에 따른 폐질환 발생을 조사했다. 비흡연 대비 흡연의 폐질환 오즈비(Odds Ratio)는?\n${block(table)}`;
    }
  }
}

function explain(p: OddsParams, s: OddsSolution): string[] {
  const v = formatNum(s.value);
  switch (p.ask) {
    case 'coef': {
      const own = p.betas[p.target];
      const power = p.delta === 1
        ? tex`e^{${formatNum(own.beta)}} = ${v}`
        : tex`e^{${formatNum(own.beta)} \times ${p.delta}} = (e^{${formatNum(own.beta)}})^{${p.delta}} = ${formatNum(own.exp)}^{${p.delta}} = ${v}`;
      return [
        `로지스틱 회귀에서 ${im('x_j')}가 1 증가하면 오즈는 ${im(tex`e^{\beta_j}`)}배(오즈비)가 됩니다.`,
        `${im(`x_${p.target + 1}`)}의 값이 ${p.delta} 증가: ${im(power)}배`,
        '※ 계수 β 자체는 로그 오즈의 증가량이지 오즈의 배수가 아닙니다. 다른 변수의 계수와 헷갈리지 않기.',
      ];
    }
    case 'prob-to-odds':
      return [
        '오즈 = 사건이 일어날 확률 ÷ 일어나지 않을 확률',
        im(tex`\text{odds} = \frac{p}{1-p} = \frac{${formatNum(p.prob)}}{${formatNum(1 - p.prob)}} = ${v}`),
        `※ 확률 자체나 역수 ${im(tex`\frac{1-p}{p}`)}를 고르지 않기. 오즈 1 ↔ 확률 0.5입니다.`,
      ];
    case 'logit': {
      const m = p.b0Units + p.b1Units * p.x;
      const z = formatNum(m * LN2);
      const odds = formatNum(2 ** m);
      return [
        `로그 오즈: ${im(tex`z = ${formatNum(p.b0Units * LN2)} ${signed(p.b1Units * LN2)} \times ${p.x} = ${z}`)}`,
        `오즈: ${im(tex`e^{z} = (e^{0.693})^{${m}} = 2^{${m}} = ${odds}`)}`,
        `확률: ${im(tex`p = \frac{e^{z}}{1 + e^{z}} = \frac{${odds}}{1 + ${odds}} = ${v}`)}`,
        '※ 로그 오즈 → 오즈 → 확률 순서로 변환합니다. 오즈 값을 그대로 확률로 고르지 않기.',
      ];
    }
    case 'table':
      return [
        `흡연군 오즈 ${im(tex`= \frac{${p.a}}{${p.b}}`)}, 비흡연군 오즈 ${im(tex`= \frac{${p.c}}{${p.d}}`)}`,
        im(tex`OR = \frac{${p.a}/${p.b}}{${p.c}/${p.d}} = \frac{${p.a} \times ${p.d}}{${p.b} \times ${p.c}} = \frac{${p.a * p.d}}{${p.b * p.c}} = ${v}`),
        `※ 상대위험도 ${im(tex`RR = \frac{a/(a+b)}{c/(c+d)}`)}와 구분하세요. OR > 1이면 흡연군의 질환 오즈가 더 큽니다.`,
      ];
  }
}

const TITLE: Record<OddsAsk, string> = {
  coef: '로지스틱 · 계수와 오즈비',
  'prob-to-odds': '로지스틱 · 확률 → 오즈',
  logit: '로지스틱 · 예측 확률',
  table: '오즈비 · 2×2 분할표',
};

function render(p: OddsParams, s: OddsSolution, rand: Rand): DrillBody {
  const suffix = p.ask === 'coef' ? '배' : '';
  const format = (x: number): string => `${formatNum(x)}${suffix}`;
  const correct = format(s.value);
  const valid = (x: number): boolean => (p.ask === 'logit' ? x > 0 && x < 1 : x > 0);
  const candidates = [...tidyFirst(mistakes(p, s), 3, format), ...nearby(s.value, 0.25, format, valid)];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const oddsGenerator = pipeline(
  { kind: 'odds', title: '오즈·오즈비', topic: '3.1.1.2' },
  makeParams,
  solve,
  render,
);
