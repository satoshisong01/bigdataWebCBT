/**
 * 연관성분석 — 지지도·신뢰도·향상도 from a small transaction table (출제기준 3.1.1.6 연관성분석).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import { hasDecimals, im, nearby, pipeline, sampleUntil, tex, tidyCount, tidyFirst, type DrillBody } from './_shared';

export type AssocMetric = 'support' | 'confidence' | 'lift';

export interface AssocParams {
  /** item indices into ITEMS per transaction */
  transactions: number[][];
  /** antecedent X (1–2 items) */
  lhs: number[];
  /** consequent Y (1 item) */
  rhs: number;
  metric: AssocMetric;
}

export interface AssocSolution {
  n: number;
  nX: number;
  nY: number;
  nXY: number;
  support: number;
  confidence: number;
  lift: number;
  value: number;
}

export const ITEMS = ['우유', '빵', '계란', '버터', '과자'];
const METRICS: readonly AssocMetric[] = ['support', 'confidence', 'lift'];
const NAME: Record<AssocMetric, string> = { support: '지지도(support)', confidence: '신뢰도(confidence)', lift: '향상도(lift)' };

/** n(X)=4, n(Y)=5, n(X∩Y)=2 of 8 → support 0.25, confidence 0.5, lift 0.8 */
const FALLBACK: Omit<AssocParams, 'metric'> = {
  transactions: [[0, 1], [0, 1, 2], [0, 2], [0, 3], [1, 3], [1, 4], [1, 2], [2, 4]],
  lhs: [0],
  rhs: 1,
};

export function solve(p: AssocParams): AssocSolution {
  const hasX = (t: readonly number[]): boolean => p.lhs.every(i => t.includes(i));
  const n = p.transactions.length;
  const nX = p.transactions.filter(hasX).length;
  const nY = p.transactions.filter(t => t.includes(p.rhs)).length;
  const nXY = p.transactions.filter(t => hasX(t) && t.includes(p.rhs)).length;
  const support = nXY / n;
  const confidence = nXY / nX;
  const lift = confidence / (nY / n);
  const metrics: Record<AssocMetric, number> = { support, confidence, lift };
  return { n, nX, nY, nXY, support, confidence, lift, value: metrics[p.metric] };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: AssocParams, s: AssocSolution): number[] {
  const reverse = s.nXY / s.nY;
  const byMetric: Record<AssocMetric, number[]> = {
    support: [s.confidence, s.nX / s.n, s.nY / s.n, reverse],
    confidence: [reverse, s.support, s.lift, s.nX / s.n],
    lift: [s.confidence, reverse, (s.nXY * s.n) / (s.nX * s.nX), 1 / s.lift],
  };
  return byMetric[p.metric];
}

function isGood(p: AssocParams): boolean {
  if (p.transactions.some(t => t.length === 0)) return false;
  const s = solve(p);
  const valid = s.nXY >= 1 && s.nX > s.nXY && s.nY > 0;
  return valid && hasDecimals(s.value, 3) && tidyCount(formatNum(s.value), mistakes(p, s), 3) >= 3;
}

function draw(rand: Rand, metric: AssocMetric): AssocParams {
  const n = pick([5, 8, 10], rand);
  const transactions = Array.from({ length: n }, () => ITEMS.map((_, i) => i).filter(() => rand() < 0.45));
  const order = shuffleWith(ITEMS.map((_, i) => i), rand);
  const lhsSize = rand() < 0.2 ? 2 : 1;
  return { transactions, lhs: order.slice(0, lhsSize).sort((a, b) => a - b), rhs: order[lhsSize], metric };
}

export function makeParams(rand: Rand): AssocParams {
  const metric = pick(METRICS, rand);
  return sampleUntil(rand, r => draw(r, metric), isGood, { ...FALLBACK, metric }, 3000);
}

function itemSet(indices: readonly number[]): string {
  return `{${indices.map(i => ITEMS[i]).join(', ')}}`;
}

function explain(p: AssocParams, s: AssocSolution): string[] {
  const v = formatNum(s.value);
  const counts = `전체 거래 ${im(`N = ${s.n}`)}, X = ${itemSet(p.lhs)} 포함 ${im(`n(X) = ${s.nX}`)}, `
    + `Y = ${itemSet([p.rhs])} 포함 ${im(`n(Y) = ${s.nY}`)}, 둘 다 포함 ${im(tex`n(X \cap Y) = ${s.nXY}`)}`;
  const confidenceTex = tex`P(Y \mid X) = \frac{n(X \cap Y)}{n(X)} = \frac{${s.nXY}}{${s.nX}} = ${formatNum(s.confidence)}`;
  if (p.metric === 'support') {
    return [
      counts,
      `지지도 ${im(tex`= P(X \cap Y) = \frac{n(X \cap Y)}{N} = \frac{${s.nXY}}{${s.n}} = ${v}`)}`,
      '※ 지지도는 X와 Y를 동시에 포함한 거래의 비율이라 규칙 방향(X→Y, Y→X)과 무관합니다.',
    ];
  }
  if (p.metric === 'confidence') {
    return [
      counts,
      `신뢰도 ${im(tex`= ${confidenceTex}`)}`,
      '※ 신뢰도는 방향이 있습니다. 분모는 조건(X)을 포함한 거래 수이며, Y→X라면 분모가 n(Y)로 바뀝니다.',
    ];
  }
  return [
    counts,
    `신뢰도 ${im(tex`= ${confidenceTex}`)}`,
    `향상도 ${im(tex`= \frac{P(Y \mid X)}{P(Y)} = \frac{n(X \cap Y) \times N}{n(X) \times n(Y)} = \frac{${s.nXY} \times ${s.n}}{${s.nX} \times ${s.nY}} = ${v}`)}`,
    '※ 향상도 > 1이면 양의 연관(함께 잘 팔림), = 1이면 독립, < 1이면 음의 연관입니다.',
  ];
}

function render(p: AssocParams, s: AssocSolution, rand: Rand): DrillBody {
  const correct = formatNum(s.value);
  const valid = (x: number): boolean => x > 0 && (p.metric === 'lift' || x < 1);
  const candidates = [...tidyFirst(mistakes(p, s), 3), ...nearby(s.value, 0.1, x => formatNum(x), valid)];
  const { options, answer } = uniqueOptions(correct, candidates, rand, () => '');
  const rule = `${itemSet(p.lhs)} → ${itemSet([p.rhs])}`;
  const rows = p.transactions.map((t, i) => `거래 ${i + 1}: ${t.map(j => ITEMS[j]).join(', ')}`).join('\n');
  return {
    title: `연관규칙 · ${NAME[p.metric]}`,
    prompt: `다음 거래 데이터에서 연관규칙 ${rule}의 ${NAME[p.metric]} 값은?\n${rows}`,
    options,
    answer,
    solution: explain(p, s).join('\n'),
  };
}

export const assocRulesGenerator = pipeline(
  { kind: 'assoc-rules', title: '지지도·신뢰도·향상도', topic: '3.1.1.6' },
  makeParams,
  solve,
  render,
);
