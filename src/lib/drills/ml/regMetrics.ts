/**
 * 회귀 평가지표 MAE·MSE·RMSE·MAPE (출제기준 4.1.1.1 평가 지표).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, hasDecimals, im, nearby, pipeline, sampleUntil, sum, tex, texTable, tidyCount, tidyFirst, type DrillBody,
} from './_shared';

export type RegMetric = 'mae' | 'mse' | 'rmse' | 'mape';

export interface RegMetricsParams {
  actual: number[];
  predicted: number[];
  metric: RegMetric;
}

export interface RegMetricsSolution {
  /** e_i = y_i − ŷ_i */
  errors: number[];
  mae: number;
  mse: number;
  rmse: number;
  /** percent scale (15 means 15%) */
  mape: number;
  value: number;
}

const METRICS: readonly RegMetric[] = ['mae', 'mse', 'rmse', 'mape'];

const NAME: Record<RegMetric, string> = {
  mae: 'MAE(평균절대오차)',
  mse: 'MSE(평균제곱오차)',
  rmse: 'RMSE(평균제곱근오차)',
  mape: 'MAPE(평균절대백분율오차)',
};

/** |e| multisets with Σe² = n·k², so RMSE is an integer. */
export const RMSE_SETS: readonly (readonly number[])[] = [
  [1, 1, 3, 5], [0, 2, 4, 4], [1, 1, 7, 7], [1, 5, 5, 7], [2, 4, 4, 8], [1, 3, 3, 9], [0, 4, 8, 8],
  [0, 1, 1, 3, 3], [1, 1, 1, 1, 4], [0, 1, 2, 2, 6], [0, 2, 3, 4, 4], [1, 1, 3, 3, 5],
  [0, 2, 2, 6, 6], [1, 3, 3, 5, 6], [0, 3, 4, 6, 8], [1, 4, 6, 6, 6],
];

/** MAPE data: actual value × percent error / 100 is always an integer. */
const MAPE_ACTUALS = [20, 40, 50, 80, 100, 120, 200, 250];
const MAPE_PERCENTS = [5, 10, 20, 25, 50];

const FALLBACK: Record<RegMetric, Omit<RegMetricsParams, 'metric'>> = {
  mae: { actual: [12, 15, 9, 20], predicted: [10, 16, 12, 15] },
  mse: { actual: [12, 15, 9, 20], predicted: [10, 16, 12, 15] },
  rmse: { actual: [20, 14, 25, 18], predicted: [19, 15, 22, 23] },
  mape: { actual: [100, 50, 200, 40], predicted: [90, 60, 190, 50] },
};

export function solve(p: RegMetricsParams): RegMetricsSolution {
  const errors = p.actual.map((y, i) => y - p.predicted[i]);
  const n = errors.length;
  const metrics: Record<RegMetric, number> = {
    mae: sum(errors.map(Math.abs)) / n,
    mse: sum(errors.map(e => e * e)) / n,
    rmse: Math.sqrt(sum(errors.map(e => e * e)) / n),
    mape: (100 * sum(errors.map((e, i) => Math.abs(e / p.actual[i])))) / n,
  };
  return { errors, ...metrics, value: metrics[p.metric] };
}

function percentErrors(p: RegMetricsParams, s: RegMetricsSolution): number[] {
  return s.errors.map((e, i) => (100 * e) / p.actual[i]);
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: RegMetricsParams, s: RegMetricsSolution): number[] {
  const n = s.errors.length;
  const absSum = sum(s.errors.map(Math.abs));
  const sqSum = sum(s.errors.map(e => e * e));
  switch (p.metric) {
    case 'mae':
      return [absSum, Math.abs(sum(s.errors)) / n, s.mse, absSum / (n - 1)];
    case 'mse':
      return [s.mae, sqSum, sum(s.errors) ** 2 / n, s.mae ** 2, s.rmse];
    case 'rmse':
      return [s.mse, s.mae, Math.sqrt(sqSum), sqSum];
    case 'mape': {
      const byPredicted = (100 * sum(s.errors.map((e, i) => Math.abs(e / p.predicted[i])))) / n;
      const pcts = percentErrors(p, s);
      return [byPredicted, sum(pcts.map(Math.abs)), Math.abs(sum(pcts)) / n, s.mae].filter(v => v > 0);
    }
  }
}

function formatValue(metric: RegMetric, x: number): string {
  return metric === 'mape' ? `${formatNum(x, 2)}%` : formatNum(x, 2);
}

function isGood(p: RegMetricsParams): boolean {
  const s = solve(p);
  const nonZero = s.errors.filter(e => e !== 0).length;
  const mixed = s.errors.some(e => e > 0) && s.errors.some(e => e < 0);
  const varied = new Set(s.errors.map(Math.abs)).size > 1;
  const tidy = tidyCount(formatValue(p.metric, s.value), mistakes(p, s), 2, x => formatValue(p.metric, x));
  return nonZero >= 3 && mixed && hasDecimals(s.value, 2) && tidy >= 3 && (p.metric === 'mape' || varied);
}

function withRandomSigns(rand: Rand, magnitudes: readonly number[]): number[] {
  return magnitudes.map(m => (rand() < 0.5 ? -m : m));
}

function draw(rand: Rand, metric: RegMetric, n: number): RegMetricsParams {
  if (metric === 'mape') {
    const actual = Array.from({ length: n }, () => pick(MAPE_ACTUALS, rand));
    const errors = actual.map(y => {
      const usable = MAPE_PERCENTS.filter(pc => (y * pc) % 100 === 0);
      return ((rand() < 0.5 ? -1 : 1) * y * pick(usable, rand)) / 100;
    });
    return { actual, predicted: actual.map((y, i) => y - errors[i]), metric };
  }
  const errors = metric === 'rmse'
    ? withRandomSigns(rand, shuffleWith(pick(RMSE_SETS.filter(set => set.length === n), rand), rand))
    : Array.from({ length: n }, () => randInt(rand, -5, 5));
  const actual = Array.from({ length: n }, () => randInt(rand, 10, 40));
  return { actual, predicted: actual.map((y, i) => y - errors[i]), metric };
}

export function makeParams(rand: Rand): RegMetricsParams {
  const metric = pick(METRICS, rand);
  const n = pick([4, 5], rand);
  return sampleUntil(rand, r => draw(r, metric, n), isGood, { ...FALLBACK[metric], metric }, 2000);
}

function explain(p: RegMetricsParams, s: RegMetricsSolution): string[] {
  const n = s.errors.length;
  const v = formatValue(p.metric, s.value);
  const absList = s.errors.map(Math.abs);
  const sqList = s.errors.map(e => e * e);
  const errorsLine = `오차 ${im(tex`e_i = y_i - \hat{y}_i`)}: ${im(s.errors.join(tex`,\ `))}`;
  const mseLine = im(tex`\text{MSE} = \frac{1}{n}\sum e_i^2 = \frac{${sqList.join(' + ')}}{${n}} = \frac{${sum(sqList)}}{${n}} = ${formatNum(s.mse, 2)}`);
  switch (p.metric) {
    case 'mae':
      return [
        errorsLine,
        im(tex`\text{MAE} = \frac{1}{n}\sum |e_i| = \frac{${absList.join(' + ')}}{${n}} = \frac{${sum(absList)}}{${n}} = ${v}`),
        '※ 절댓값을 빼먹으면 양(+)·음(−) 오차가 서로 상쇄됩니다.',
      ];
    case 'mse':
      return [errorsLine, mseLine, '※ 오차를 각각 제곱한 뒤 평균합니다. 제곱 때문에 큰 오차(이상값)에 민감합니다.'];
    case 'rmse':
      return [
        errorsLine,
        mseLine,
        im(tex`\text{RMSE} = \sqrt{\text{MSE}} = \sqrt{${formatNum(s.mse, 2)}} = ${v}`),
        '※ 마지막에 제곱근을 씌워 원래 단위로 되돌립니다(MSE와 구분).',
      ];
    case 'mape': {
      const pcts = percentErrors(p, s).map(x => formatNum(Math.abs(x), 2));
      return [
        errorsLine,
        `관측치별 ${im(tex`\left|\frac{e_i}{y_i}\right| \times 100`)}: ${pcts.map(x => `${x}%`).join(', ')}`,
        im(tex`\text{MAPE} = \frac{100}{n}\sum \left|\frac{e_i}{y_i}\right| = \frac{${pcts.join(' + ')}}{${n}} = ${formatNum(s.value, 2)}\%`),
        '※ 분모는 예측값이 아니라 실제값 y입니다. 실제값이 0이면 MAPE를 계산할 수 없습니다.',
      ];
    }
  }
}

function render(p: RegMetricsParams, s: RegMetricsSolution, rand: Rand): DrillBody {
  const format = (x: number): string => formatValue(p.metric, x);
  const correct = format(s.value);
  const candidates = [...tidyFirst(mistakes(p, s), 2, format), ...nearby(s.value, 0.5, format, x => x > 0)];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  const n = p.actual.length;
  const table = texTable(`c|${'c'.repeat(n)}`, [
    ['i', ...p.actual.map((_, i) => i + 1)],
    [tex`y_i\ (\text{실제})`, ...p.actual],
    [tex`\hat{y}_i\ (\text{예측})`, ...p.predicted],
  ]);
  return {
    title: `회귀 평가지표 · ${NAME[p.metric]}`,
    prompt: `다음 실제값과 예측값으로 구한 ${NAME[p.metric]} 값은?\n${block(table)}`,
    options,
    answer,
    solution: explain(p, s).join('\n'),
  };
}

export const regMetricsGenerator = pipeline(
  { kind: 'reg-metrics', title: 'MAE·MSE·RMSE·MAPE', topic: '4.1.1.1' },
  makeParams,
  solve,
  render,
);
