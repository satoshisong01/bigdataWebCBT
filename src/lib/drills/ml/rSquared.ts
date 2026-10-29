/**
 * 결정계수 R²·조정 결정계수 from SST/SSR/SSE, n, p (출제기준 4.1.1.2 분석모형 진단).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  distinctOthers, fixedNum, hasDecimals, im, nearby, pipeline, sampleUntil, tex, type DrillBody,
} from './_shared';

export type RSquaredAsk = 'r2' | 'adj';
/** Which two sums of squares the prompt shows. */
export type SumsGiven = 'sst-sse' | 'ssr-sse' | 'sst-ssr';

export interface RSquaredParams {
  sst: number;
  sse: number;
  /** 표본 수 n */
  n: number;
  /** 독립변수 개수 p */
  predictors: number;
  ask: RSquaredAsk;
  given: SumsGiven;
}

export interface RSquaredSolution {
  ssr: number;
  r2: number;
  adj: number;
  value: number;
}

const ASKS: readonly RSquaredAsk[] = ['r2', 'adj'];
const GIVENS: readonly SumsGiven[] = ['sst-sse', 'ssr-sse', 'sst-ssr'];
const SSTS = [100, 200, 250, 400, 500, 800, 1000];
const R2S = [0.5, 0.6, 0.64, 0.7, 0.72, 0.75, 0.8, 0.84, 0.85, 0.88, 0.9, 0.92, 0.95, 0.96];
/** (n, p) with a friendly (n−1)/(n−p−1): 1.25, 1.2, 1.125, 4/3, 1.5, 2 */
const DESIGNS: readonly (readonly [number, number])[] = [
  [11, 2], [16, 3], [21, 4], [26, 5], [41, 8], [51, 10], [13, 2], [25, 4],
  [31, 5], [19, 3], [10, 1], [13, 3], [21, 5], [16, 5], [31, 10], [21, 10],
];
const FALLBACK = { sst: 200, sse: 40, n: 21, predictors: 4 };

export function solve(q: RSquaredParams): RSquaredSolution {
  const r2 = 1 - q.sse / q.sst;
  const adj = 1 - ((1 - r2) * (q.n - 1)) / (q.n - q.predictors - 1);
  return { ssr: q.sst - q.sse, r2, adj, value: q.ask === 'r2' ? r2 : adj };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(q: RSquaredParams, s: RSquaredSolution): number[] {
  const { n, predictors: k } = q;
  const resid = 1 - s.r2;
  if (q.ask === 'adj') {
    return [
      s.r2,
      1 - (resid * (n - 1)) / (n - k),
      1 - (resid * (n - k - 1)) / (n - 1),
      1 - (resid * n) / (n - k - 1),
      (resid * (n - 1)) / (n - k - 1),
    ].filter(v => v > 0 && v < 1);
  }
  return [resid, q.sse / s.ssr, 1 - q.sse / s.ssr, s.adj].filter(v => v > 0 && v < 1);
}

/** Every option is shown with the answer's precision (R²: 2 decimals, adjusted R²: 3). */
function formatter(q: RSquaredParams): (x: number) => string {
  const digits = q.ask === 'r2' ? 2 : 3;
  return x => fixedNum(x, digits);
}

function isGood(q: RSquaredParams): boolean {
  const s = solve(q);
  const format = formatter(q);
  const others = distinctOthers(format(s.value), mistakes(q, s).map(format));
  const valueOk = q.ask === 'r2' || (hasDecimals(s.adj, 3) && s.adj > 0);
  return hasDecimals(s.r2, 2) && s.r2 > 0 && s.r2 < 1 && valueOk && others >= 3;
}

export function makeParams(rand: Rand): RSquaredParams {
  const ask = pick(ASKS, rand);
  const given = pick(GIVENS, rand);
  const draw = (r: Rand): RSquaredParams => {
    const sst = pick(SSTS, r);
    const [n, predictors] = pick(DESIGNS, r);
    return { sst, sse: Math.round(sst * (1 - pick(R2S, r))), n, predictors, ask, given };
  };
  return sampleUntil(rand, draw, isGood, { ...FALLBACK, ask, given }, 2000);
}

function givenText(q: RSquaredParams, s: RSquaredSolution): string {
  const shown: Record<SumsGiven, [string, number][]> = {
    'sst-sse': [['SST', q.sst], ['SSE', q.sse]],
    'ssr-sse': [['SSR', s.ssr], ['SSE', q.sse]],
    'sst-ssr': [['SST', q.sst], ['SSR', s.ssr]],
  };
  return shown[q.given].map(([name, value]) => im(`${name} = ${value}`)).join(', ');
}

function explain(q: RSquaredParams, s: RSquaredSolution): string[] {
  const { n, predictors: k } = q;
  const completion: Record<SumsGiven, string[]> = {
    'sst-sse': [],
    'ssr-sse': [`먼저 ${im(tex`SST = SSR + SSE = ${s.ssr} + ${q.sse} = ${q.sst}`)}`],
    'sst-ssr': [`먼저 ${im(tex`SSE = SST - SSR = ${q.sst} - ${s.ssr} = ${q.sse}`)}`],
  };
  const r2Line = im(tex`R^2 = 1 - \frac{SSE}{SST} = 1 - \frac{${q.sse}}{${q.sst}} = ${formatNum(s.r2)}`)
    + ` (${im(tex`= \frac{SSR}{SST}`)})`;
  if (q.ask === 'r2') {
    return [
      ...completion[q.given],
      r2Line,
      '※ 결정계수 = 전체 변동(SST) 중 회귀식이 설명하는 변동(SSR)의 비율. 1 − R² = SSE/SST입니다.',
    ];
  }
  const resid = formatNum(1 - s.r2);
  const penalty = formatNum(((1 - s.r2) * (n - 1)) / (n - k - 1), 4);
  return [
    ...completion[q.given],
    r2Line,
    im(tex`R^2_{adj} = 1 - (1 - R^2)\frac{n-1}{n-p-1} = 1 - ${resid} \times \frac{${n - 1}}{${n - k - 1}} = 1 - ${penalty} = ${formatNum(s.adj)}`),
    '※ 조정 결정계수는 변수 개수로 벌점을 주어 불필요한 변수가 늘면 줄어들 수 있으며, 항상 R² 이하입니다.',
  ];
}

function render(q: RSquaredParams, s: RSquaredSolution, rand: Rand): DrillBody {
  const format = formatter(q);
  const correct = format(s.value);
  const candidates = [...mistakes(q, s).map(format), ...nearby(s.value, 0.05, format, x => x > 0 && x < 1)];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  const target = q.ask === 'r2' ? `결정계수 ${im('R^2')}` : `조정(수정) 결정계수 ${im(tex`R^2_{adj}`)}`;
  return {
    title: q.ask === 'r2' ? '결정계수 R²' : '조정 결정계수',
    prompt: `표본 ${im(`n = ${q.n}`)}, 독립변수 ${im(`p = ${q.predictors}`)}개인 회귀분석에서 ${givenText(q, s)}이다. `
      + `${target}의 값은?\n(SST: 총제곱합, SSR: 회귀제곱합, SSE: 잔차제곱합)`,
    options,
    answer,
    solution: explain(q, s).join('\n'),
  };
}

export const rSquaredGenerator = pipeline(
  { kind: 'r-squared', title: '결정계수·조정 R²', topic: '4.1.1.2' },
  makeParams,
  solve,
  render,
);
