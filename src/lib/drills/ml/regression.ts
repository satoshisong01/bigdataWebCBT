/**
 * 단순선형회귀 — 예측값·잔차·최소제곱 회귀식 (출제기준 3.1.1.1 회귀분석).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  hasDecimals, im, nearby, paren, pipeline, roundTo, sampleUntil, signed, tex, tidyCount, tidyFirst, type DrillBody,
} from './_shared';

export type RegressionAsk = 'predict' | 'residual' | 'fit';

export interface RegressionParams {
  ask: RegressionAsk;
  /** intercept and slope of the fitted line (shown for 'predict' / 'residual') */
  b0: number;
  b1: number;
  /** x where ŷ is evaluated */
  x: number;
  /** observed y at x ('residual') */
  y: number;
  /** summary statistics for 'fit' (0 otherwise): b1 = Sxy/Sxx, b0 = ȳ − b1·x̄ */
  xBar: number;
  yBar: number;
  sxx: number;
  sxy: number;
}

export interface RegressionSolution {
  b0: number;
  b1: number;
  yHat: number;
  residual: number;
  value: number;
}

const ASKS: readonly RegressionAsk[] = ['predict', 'residual', 'fit'];
const SLOPES = [0.5, 1.5, 2, 2.5, 3, 4, 1.2, 0.8, -0.5, -1.5, -2, -3, -1.2, -0.8];
const INTERCEPTS = [-5, -3, -2, -1.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12];
const RESIDUALS = [-4, -3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3, 4];
const SXX = [10, 20, 25, 40, 50];
const FALLBACK: RegressionParams = { ask: 'predict', b0: 3, b1: 1.5, x: 4, y: 10, xBar: 5, yBar: 10.5, sxx: 20, sxy: 30 };

export function solve(p: RegressionParams): RegressionSolution {
  const b1 = p.ask === 'fit' ? p.sxy / p.sxx : p.b1;
  const b0 = p.ask === 'fit' ? p.yBar - b1 * p.xBar : p.b0;
  const yHat = b0 + b1 * p.x;
  const residual = p.y - yHat;
  return { b0, b1, yHat, residual, value: p.ask === 'residual' ? residual : yHat };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: RegressionParams, s: RegressionSolution): number[] {
  if (p.ask === 'predict') return [s.b1 + s.b0 * p.x, s.b1 * p.x, s.b0 - s.b1 * p.x, (s.b0 + s.b1) * p.x];
  if (p.ask === 'residual') return [-s.residual, s.yHat, p.y - s.b1 * p.x, p.y - s.b0];
  const flipped = p.sxx / p.sxy;
  return [
    p.yBar - flipped * p.xBar + flipped * p.x,
    p.yBar + s.b1 * p.xBar + s.b1 * p.x,
    s.b1 * p.x,
    p.yBar,
  ];
}

function isGood(p: RegressionParams): boolean {
  const s = solve(p);
  const tidy = tidyCount(formatNum(s.value, 2), mistakes(p, s), 2, x => formatNum(x, 2));
  const fitOk = p.ask !== 'fit' || (hasDecimals(p.sxy, 0) && p.x !== p.xBar);
  return hasDecimals(s.value, 2) && s.value !== 0 && s.yHat > 0 && p.y > 0 && fitOk && tidy >= 3;
}

function draw(rand: Rand, ask: RegressionAsk): RegressionParams {
  const b1 = pick(SLOPES, rand);
  const b0 = pick(INTERCEPTS, rand);
  const x = randInt(rand, 2, 12);
  const y = roundTo(b0 + b1 * x + pick(RESIDUALS, rand), 2);
  if (ask !== 'fit') return { ask, b0, b1, x, y, xBar: 0, yBar: 0, sxx: 0, sxy: 0 };
  const sxx = pick(SXX, rand);
  const xBar = randInt(rand, 2, 8);
  return { ask, b0, b1, x, y, xBar, yBar: roundTo(b0 + b1 * xBar, 2), sxx, sxy: roundTo(b1 * sxx, 2) };
}

export function makeParams(rand: Rand): RegressionParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, { ...FALLBACK, ask }, 2000);
}

function lineTex(b0: number, b1: number): string {
  return tex`\hat{y} = ${formatNum(b0, 2)} ${signed(b1, 2)}x`;
}

function predictionTex(b0: number, b1: number, x: number, yHat: number): string {
  return tex`\hat{y} = ${formatNum(b0, 2)} ${signed(b1, 2)} \times ${x} = ${formatNum(yHat, 2)}`;
}

function explain(p: RegressionParams, s: RegressionSolution): string[] {
  const v = formatNum(s.value, 2);
  if (p.ask === 'predict') {
    return [
      `회귀식에 ${im(`x = ${p.x}`)} 대입:`,
      im(predictionTex(s.b0, s.b1, p.x, s.yHat)),
      '※ 절편(상수항)과 기울기(x의 계수)를 바꿔 대입하지 않도록 주의합니다.',
    ];
  }
  if (p.ask === 'residual') {
    return [
      `먼저 예측값: ${im(predictionTex(s.b0, s.b1, p.x, s.yHat))}`,
      `잔차 = 실제값 − 예측값: ${im(tex`e = y - \hat{y} = ${formatNum(p.y, 2)} - ${paren(s.yHat, 2)} = ${v}`)}`,
      `※ 잔차는 ${im(tex`y - \hat{y}`)}입니다(${im(tex`\hat{y} - y`)}로 부호를 뒤집지 않기). 잔차가 양수면 모형이 과소예측한 것입니다.`,
    ];
  }
  return [
    `기울기: ${im(tex`b_1 = \frac{S_{xy}}{S_{xx}} = \frac{${formatNum(p.sxy, 2)}}{${p.sxx}} = ${formatNum(s.b1, 2)}`)}`,
    `절편: ${im(tex`b_0 = \bar{y} - b_1\bar{x} = ${formatNum(p.yBar, 2)} - ${paren(s.b1, 2)} \times ${p.xBar} = ${formatNum(s.b0, 2)}`)}`,
    `회귀식 ${im(lineTex(s.b0, s.b1))}에 대입: ${im(predictionTex(s.b0, s.b1, p.x, s.yHat))}`,
    `※ 최소제곱 회귀직선은 항상 평균점 ${im(tex`(\bar{x}, \bar{y})`)}를 지납니다.`,
  ];
}

function prompt(p: RegressionParams): string {
  if (p.ask === 'predict') {
    return `단순선형회귀 결과 회귀식이 ${im(lineTex(p.b0, p.b1))}로 추정되었다. ${im(`x = ${p.x}`)}일 때 예측값 ${im(tex`\hat{y}`)}는?`;
  }
  if (p.ask === 'residual') {
    return `추정된 회귀식이 ${im(lineTex(p.b0, p.b1))}일 때, 관측값 ${im(`(x, y) = (${p.x}, ${formatNum(p.y, 2)})`)}의 잔차는?`;
  }
  return `${im(tex`\bar{x} = ${p.xBar}`)}, ${im(tex`\bar{y} = ${formatNum(p.yBar, 2)}`)}, `
    + `${im(tex`S_{xx} = \sum(x_i - \bar{x})^2 = ${p.sxx}`)}, ${im(tex`S_{xy} = \sum(x_i - \bar{x})(y_i - \bar{y}) = ${formatNum(p.sxy, 2)}`)}이다. `
    + `최소제곱법으로 추정한 회귀식으로 ${im(`x = ${p.x}`)}일 때의 예측값은?`;
}

const TITLE: Record<RegressionAsk, string> = {
  predict: '단순회귀 · 예측값',
  residual: '단순회귀 · 잔차',
  fit: '단순회귀 · 최소제곱 추정',
};

function render(p: RegressionParams, s: RegressionSolution, rand: Rand): DrillBody {
  const format = (x: number): string => formatNum(x, 2);
  const correct = format(s.value);
  const candidates = [...tidyFirst(mistakes(p, s), 2, format), ...nearby(s.value, 1, format)];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const regressionGenerator = pipeline(
  { kind: 'regression', title: '단순회귀 예측·잔차', topic: '3.1.1.1' },
  makeParams,
  solve,
  render,
);
