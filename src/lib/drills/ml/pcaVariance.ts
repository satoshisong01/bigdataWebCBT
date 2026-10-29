/**
 * 주성분분석 — 고유값 → 설명 분산 비율·누적 기여율·필요 주성분 수 (출제기준 3.1.1.8 주성분분석).
 * Eigenvalues are built from whole "units" so every percentage is exact.
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { distinctOthers, hasDecimals, im, nearby, pipeline, roundTo, sampleUntil, sum, tex, type DrillBody } from './_shared';

export type PcaAsk = 'ratio' | 'cumulative' | 'count' | 'kaiser';

export interface PcaParams {
  ask: PcaAsk;
  /** eigenvalues, strictly decreasing */
  eigen: number[];
  /** PCA on standardized variables (correlation matrix): Σλ = number of variables */
  standardized: boolean;
  /** component index for 'ratio' / number of leading components for 'cumulative' (1-based) */
  m: number;
  /** cumulative-percent threshold for 'count' */
  threshold: number;
}

export interface PcaSolution {
  total: number;
  /** percent per component */
  ratios: number[];
  /** cumulative percent */
  cumulative: number[];
  /** components with λ ≥ 1 */
  kaiser: number;
  /** fewest leading components reaching the threshold */
  needed: number;
  value: number;
}

/** total Σλ, eigenvalue unit, component count (corr: Σλ = k) */
interface Scenario {
  total: number;
  unit: number;
  k: number;
  standardized: boolean;
}

const SCENARIOS: readonly Scenario[] = [
  { total: 4, unit: 0.2, k: 4, standardized: true },
  { total: 5, unit: 0.1, k: 5, standardized: true },
  { total: 10, unit: 0.1, k: 4, standardized: false },
  { total: 10, unit: 0.1, k: 5, standardized: false },
  { total: 20, unit: 0.5, k: 5, standardized: false },
];
const ASKS: readonly PcaAsk[] = ['ratio', 'cumulative', 'count', 'kaiser'];
const FALLBACK: Omit<PcaParams, 'ask'> = { eigen: [2.4, 1.3, 0.7, 0.4, 0.2], standardized: true, m: 2, threshold: 80 };

export function solve(p: PcaParams): PcaSolution {
  const total = roundTo(sum(p.eigen), 4);
  const ratios = p.eigen.map(l => roundTo((100 * l) / total, 4));
  const cumulative = ratios.map((_, i) => roundTo(sum(ratios.slice(0, i + 1)), 4));
  const kaiser = p.eigen.filter(l => l >= 1).length;
  const reached = cumulative.findIndex(c => c >= p.threshold);
  const needed = reached === -1 ? p.eigen.length : reached + 1;
  const values: Record<PcaAsk, number> = {
    ratio: ratios[p.m - 1],
    cumulative: cumulative[p.m - 1],
    count: needed,
    kaiser,
  };
  return { total, ratios, cumulative, kaiser, needed, value: values[p.ask] };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: PcaParams, s: PcaSolution): number[] {
  const k = p.eigen.length;
  const m = p.m;
  switch (p.ask) {
    case 'ratio':
      return [
        s.cumulative[Math.max(m - 1, 1)],
        s.ratios[m] ?? s.ratios[m - 2],
        (100 * p.eigen[m - 1]) / p.eigen[0],
        (100 * p.eigen[m - 1]) / k,
      ];
    case 'cumulative':
      return [s.ratios[m - 1], s.cumulative[m - 2], s.cumulative[m], (100 * sum(p.eigen.slice(0, m))) / k];
    case 'count':
      return [s.needed - 1, s.needed + 1, ...(p.standardized ? [s.kaiser] : []), k];
    case 'kaiser':
      return [s.needed, s.kaiser - 1, s.kaiser + 1, k];
  }
}

function format(p: PcaParams, x: number): string {
  return p.ask === 'count' || p.ask === 'kaiser' ? `${x}개` : `${formatNum(x, 1)}%`;
}

/** Counts must be 1..k components; percentages strictly between 0 and 100. */
function inRange(p: PcaParams, x: number): boolean {
  const counting = p.ask === 'count' || p.ask === 'kaiser';
  return Number.isFinite(x) && x > 0 && (counting ? Number.isInteger(x) && x <= p.eigen.length : x < 100);
}

function isGood(p: PcaParams): boolean {
  const s = solve(p);
  const k = p.eigen.length;
  const decreasing = p.eigen.every((l, i) => l > 0 && (i === 0 || l < p.eigen[i - 1]));
  const exact = s.ratios.every(r => hasDecimals(r, 1));
  const onThreshold = s.cumulative.some(c => Math.abs(c - p.threshold) < 1e-9);
  const asks: Record<PcaAsk, boolean> = {
    ratio: true,
    cumulative: true,
    count: !onThreshold && s.needed >= 2 && s.needed < k,
    kaiser: p.standardized && !p.eigen.includes(1) && s.kaiser >= 1 && s.kaiser < k,
  };
  const others = distinctOthers(format(p, s.value), mistakes(p, s).filter(v => inRange(p, v)).map(v => format(p, v)));
  return decreasing && exact && p.eigen[0] / s.total >= 0.3 && asks[p.ask] && others >= 3;
}

function draw(rand: Rand, ask: PcaAsk): PcaParams {
  const scenario = ask === 'kaiser' ? pick(SCENARIOS.filter(sc => sc.standardized), rand) : pick(SCENARIOS, rand);
  const units = Math.round(scenario.total / scenario.unit);
  const cuts = Array.from({ length: scenario.k - 1 }, () => randInt(rand, 1, units - 1)).sort((a, b) => a - b);
  const parts = [...cuts, units].map((c, i) => c - (i === 0 ? 0 : cuts[i - 1])).sort((a, b) => b - a);
  return {
    ask,
    eigen: parts.map(u => roundTo(u * scenario.unit, 4)),
    standardized: scenario.standardized,
    m: ask === 'ratio' ? randInt(rand, 1, 3) : randInt(rand, 2, 3),
    threshold: pick([70, 80, 90], rand),
  };
}

export function makeParams(rand: Rand): PcaParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, { ...FALLBACK, ask }, 3000);
}

function eigenText(eigen: readonly number[]): string {
  return im(eigen.map((l, i) => tex`\lambda_${i + 1} = ${formatNum(l, 2)}`).join(tex`,\; `));
}

function prompt(p: PcaParams): string {
  const k = p.eigen.length;
  const setup = p.standardized
    ? `변수 ${k}개를 표준화한 뒤(상관행렬 기반) 주성분분석을 수행한 고유값은 ${eigenText(p.eigen)}이다.`
    : `공분산행렬로 주성분분석을 수행한 고유값은 ${eigenText(p.eigen)}이다.`;
  const question: Record<PcaAsk, string> = {
    ratio: `제${p.m}주성분의 설명 분산 비율(기여율)은?`,
    cumulative: `제1~제${p.m}주성분까지의 누적 기여율은?`,
    count: `누적 기여율이 ${p.threshold}% 이상이 되려면 최소 몇 개의 주성분이 필요한가?`,
    kaiser: '카이저(Kaiser) 기준(고유값 1 이상)으로 선택할 주성분의 개수는?',
  };
  return `${setup} ${question[p.ask]}`;
}

function explain(p: PcaParams, s: PcaSolution): string[] {
  const total = `전체 분산 = 고유값의 합 ${im(tex`\sum\lambda_i = ${formatNum(s.total, 2)}`)}`
    + (p.standardized ? ' (표준화했으므로 변수 개수와 같음)' : '');
  const share = (i: number): string => tex`\frac{${formatNum(p.eigen[i], 2)}}{${formatNum(s.total, 2)}} = ${formatNum(s.ratios[i], 1)}\%`;
  const cumulativeLines = s.cumulative.map((c, i) => `${i + 1}개 ${formatNum(c, 1)}%`).join(', ');
  switch (p.ask) {
    case 'ratio':
      return [
        total,
        `제${p.m}주성분 기여율 = ${im(tex`\frac{\lambda_${p.m}}{\sum\lambda_i} = ${share(p.m - 1)}`)}`,
        '※ 기여율은 해당 성분 하나의 비율, 누적 기여율은 1번부터 더한 비율입니다.',
      ];
    case 'cumulative':
      return [
        total,
        `${im(tex`\frac{${p.eigen.slice(0, p.m).map(l => formatNum(l, 2)).join(' + ')}}{${formatNum(s.total, 2)}} = ${formatNum(s.value, 1)}\%`)}`,
        '※ 누적 기여율이 보통 70~90% 이상이 되는 지점까지 주성분을 선택합니다.',
      ];
    case 'count':
      return [
        total,
        `누적 기여율: ${cumulativeLines}`,
        `처음으로 ${p.threshold}% 이상이 되는 것은 ${s.needed}번째 → ${s.needed}개`,
        '※ "이상"이므로 경곗값과 같아도 포함합니다. 고유값 1 이상 기준(카이저)과는 다른 기준입니다.',
      ];
    case 'kaiser':
      return [
        '카이저 기준: 표준화(상관행렬) PCA에서 고유값이 1 이상인 주성분만 선택합니다.',
        `고유값 1 이상: ${p.eigen.filter(l => l >= 1).map(l => formatNum(l, 2)).join(', ')} → ${s.kaiser}개`,
        '※ 고유값 1은 원래 변수 1개분의 분산입니다. 누적 기여율 기준이나 스크리 도표(꺾이는 지점)와 구분하세요.',
      ];
  }
}

const TITLE: Record<PcaAsk, string> = {
  ratio: 'PCA · 설명 분산 비율',
  cumulative: 'PCA · 누적 기여율',
  count: 'PCA · 필요한 주성분 수',
  kaiser: 'PCA · 카이저 기준',
};

function render(p: PcaParams, s: PcaSolution, rand: Rand): DrillBody {
  const fmt = (x: number): string => format(p, x);
  const valid = (x: number): boolean => inRange(p, x);
  const counting = p.ask === 'count' || p.ask === 'kaiser';
  const candidates = [...mistakes(p, s).filter(valid).map(fmt), ...nearby(s.value, counting ? 1 : 5, fmt, valid)];
  const { options, answer } = uniqueOptions(fmt(s.value), candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const pcaVarianceGenerator = pipeline(
  { kind: 'pca-variance', title: 'PCA 설명 분산', topic: '3.1.1.8' },
  makeParams,
  solve,
  render,
);
