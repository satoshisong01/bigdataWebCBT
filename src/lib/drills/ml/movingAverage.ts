/**
 * 시계열 — 단순 이동평균·단순 지수평활 예측 (출제기준 3.1.2.3 시계열 분석).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, hasDecimals, im, nearby, pipeline, roundTo, sampleUntil, sum, tex, texTable, tidyCount, tidyFirst,
  type DrillBody,
} from './_shared';

export type MovingAverageAsk = 'sma' | 'ses' | 'ses2';

export interface MovingAverageParams {
  ask: MovingAverageAsk;
  /** y_1..y_n ('sma'), [y_t] ('ses'), [y_1, y_2] ('ses2') */
  series: number[];
  /** window k ('sma'; 0 otherwise) */
  window: number;
  /** smoothing constant α ('ses', 'ses2'; 0 otherwise) */
  alpha: number;
  /** F_t ('ses') or F_1 ('ses2'); 0 for 'sma' */
  forecast: number;
}

export interface MovingAverageSolution {
  /** F_2 for 'ses2' (0 otherwise) */
  step: number;
  value: number;
}

const ASKS: readonly MovingAverageAsk[] = ['sma', 'ses', 'ses2'];
const ALPHAS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const FALLBACKS: Record<MovingAverageAsk, MovingAverageParams> = {
  sma: { ask: 'sma', series: [52, 61, 48, 57, 66, 60], window: 3, alpha: 0, forecast: 0 },
  ses: { ask: 'ses', series: [120], window: 0, alpha: 0.3, forecast: 100 },
  ses2: { ask: 'ses2', series: [120, 90], window: 0, alpha: 0.4, forecast: 100 },
};

function mean(xs: readonly number[]): number {
  return sum(xs) / xs.length;
}

function smooth(alpha: number, actual: number, forecast: number): number {
  return roundTo(alpha * actual + (1 - alpha) * forecast, 4);
}

export function solve(p: MovingAverageParams): MovingAverageSolution {
  if (p.ask === 'sma') return { step: 0, value: mean(p.series.slice(-p.window)) };
  if (p.ask === 'ses') return { step: 0, value: smooth(p.alpha, p.series[0], p.forecast) };
  const step = smooth(p.alpha, p.series[0], p.forecast);
  return { step, value: smooth(p.alpha, p.series[1], step) };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: MovingAverageParams, s: MovingAverageSolution): number[] {
  const [y1, y2] = p.series;
  if (p.ask === 'sma') {
    const k = p.window;
    return [mean(p.series.slice(-(k - 1))), mean(p.series.slice(-(k + 1))), mean(p.series), mean(p.series.slice(0, k)), p.series[p.series.length - 1]];
  }
  if (p.ask === 'ses') {
    return [smooth(1 - p.alpha, y1, p.forecast), (y1 + p.forecast) / 2, y1, p.forecast, roundTo(p.alpha * y1, 4)];
  }
  const swapped = smooth(1 - p.alpha, y2, smooth(1 - p.alpha, y1, p.forecast));
  return [s.step, smooth(p.alpha, y2, p.forecast), swapped, (y1 + y2) / 2];
}

function isGood(p: MovingAverageParams): boolean {
  const s = solve(p);
  const tidy = tidyCount(formatNum(s.value, 2), mistakes(p, s), 2, x => formatNum(x, 2));
  const distinctInputs = p.ask === 'sma' || new Set([...p.series, p.forecast]).size === p.series.length + 1;
  return hasDecimals(s.value, 2) && distinctInputs && tidy >= 3;
}

function draw(rand: Rand, ask: MovingAverageAsk): MovingAverageParams {
  if (ask === 'sma') {
    const n = randInt(rand, 6, 8);
    return { ask, series: Array.from({ length: n }, () => randInt(rand, 20, 80)), window: pick([3, 4, 5], rand), alpha: 0, forecast: 0 };
  }
  if (ask === 'ses') {
    return { ask, series: [randInt(rand, 40, 160)], window: 0, alpha: pick(ALPHAS, rand), forecast: randInt(rand, 40, 160) };
  }
  const tens = (): number => 10 * randInt(rand, 5, 15);
  return { ask, series: [tens(), tens()], window: 0, alpha: pick([0.2, 0.3, 0.4, 0.5], rand), forecast: tens() };
}

export function makeParams(rand: Rand): MovingAverageParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 2000);
}

function explain(p: MovingAverageParams, s: MovingAverageSolution): string[] {
  const v = formatNum(s.value, 2);
  const a = formatNum(p.alpha);
  const rest = formatNum(1 - p.alpha);
  if (p.ask === 'sma') {
    const n = p.series.length;
    const recent = p.series.slice(-p.window);
    return [
      `가장 최근 ${p.window}개(${n - p.window + 1}~${n}월)의 평균으로 다음 달을 예측합니다.`,
      im(tex`\hat{y}_{${n + 1}} = \frac{${recent.join(' + ')}}{${p.window}} = \frac{${sum(recent)}}{${p.window}} = ${v}`),
      '※ 이동평균 기간(k)이 길수록 평활 효과가 커지고 변화에는 늦게 반응합니다.',
    ];
  }
  if (p.ask === 'ses') {
    return [
      im(tex`F_{t+1} = \alpha y_t + (1 - \alpha)F_t = ${a} \times ${p.series[0]} + ${rest} \times ${p.forecast} = ${v}`),
      '※ α가 클수록 최근 실제값을 더 많이 반영합니다. α와 1 − α의 자리를 바꾸지 않기.',
    ];
  }
  return [
    `2기 예측: ${im(tex`F_2 = ${a} \times ${p.series[0]} + ${rest} \times ${p.forecast} = ${formatNum(s.step, 2)}`)}`,
    `3기 예측: ${im(tex`F_3 = ${a} \times ${p.series[1]} + ${rest} \times ${formatNum(s.step, 2)} = ${v}`)}`,
    '※ 지수평활은 직전 예측값을 갱신해 가는 방식이라 한 단계씩 차례로 계산해야 합니다.',
  ];
}

function prompt(p: MovingAverageParams): string {
  if (p.ask === 'sma') {
    const n = p.series.length;
    const table = texTable(`c|${'c'.repeat(n)}`, [
      [tex`\text{월}`, ...p.series.map((_, i) => i + 1)],
      [tex`\text{판매량}`, ...p.series],
    ]);
    return `다음은 월별 판매량이다. ${p.window}개월 단순이동평균으로 ${n + 1}월 판매량을 예측하면?\n${block(table)}`;
  }
  if (p.ask === 'ses') {
    return `단순 지수평활법(평활상수 ${im(tex`\alpha = ${formatNum(p.alpha)}`)})에서 이번 기의 실제값이 ${im(`y_t = ${p.series[0]}`)}, `
      + `예측값이 ${im(`F_t = ${p.forecast}`)}일 때 다음 기 예측값 ${im('F_{t+1}')}은?`;
  }
  return `단순 지수평활법(${im(tex`\alpha = ${formatNum(p.alpha)}`)})으로 예측한다. 1기 예측값 ${im(`F_1 = ${p.forecast}`)}, `
    + `실제값 ${im(`y_1 = ${p.series[0]}`)}, ${im(`y_2 = ${p.series[1]}`)}일 때 3기 예측값 ${im('F_3')}은?`;
}

const TITLE: Record<MovingAverageAsk, string> = {
  sma: '시계열 · 단순이동평균',
  ses: '시계열 · 지수평활',
  ses2: '시계열 · 지수평활 2단계',
};

function render(p: MovingAverageParams, s: MovingAverageSolution, rand: Rand): DrillBody {
  const format = (x: number): string => formatNum(x, 2);
  const candidates = [...tidyFirst(mistakes(p, s), 2, format), ...nearby(s.value, 2, format, x => x > 0)];
  const { options, answer } = uniqueOptions(format(s.value), candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const movingAverageGenerator = pipeline(
  { kind: 'moving-average', title: '이동평균·지수평활', topic: '3.1.2.3' },
  makeParams,
  solve,
  render,
);
