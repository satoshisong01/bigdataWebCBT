import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { nearby } from './shared';

export type DofParams =
  | { ask: 'one-sample-t'; n: number }
  | { ask: 'paired-t'; pairs: number }
  | { ask: 'two-sample-t'; n1: number; n2: number }
  | { ask: 'chi-independence'; rows: number; cols: number; total: number }
  | { ask: 'chi-gof'; categories: number; total: number }
  | { ask: 'anova-between' | 'anova-within' | 'anova-total'; groups: number; perGroup: number };

type Ask = DofParams['ask'];
type Anova = Extract<DofParams, { ask: 'anova-between' | 'anova-within' | 'anova-total' }>;

const ASKS: readonly Ask[] = [
  'one-sample-t', 'paired-t', 'two-sample-t', 'chi-independence', 'chi-gof', 'anova-between', 'anova-within', 'anova-total',
];

function makeParams(rand: Rand): DofParams {
  const ask = pick(ASKS, rand);
  switch (ask) {
    case 'one-sample-t':
      return { ask, n: randInt(rand, 8, 40) };
    case 'paired-t':
      return { ask, pairs: randInt(rand, 6, 30) };
    case 'two-sample-t':
      return { ask, n1: randInt(rand, 6, 30), n2: randInt(rand, 6, 30) };
    case 'chi-independence':
      return { ask, rows: randInt(rand, 2, 4), cols: randInt(rand, 2, 5), total: 50 * randInt(rand, 2, 10) };
    case 'chi-gof': {
      const categories = randInt(rand, 3, 8);
      return { ask, categories, total: categories * randInt(rand, 10, 30) };
    }
    default:
      return { ask, groups: randInt(rand, 3, 5), perGroup: randInt(rand, 4, 12) };
  }
}

function solve(p: DofParams): number {
  switch (p.ask) {
    case 'one-sample-t':
      return p.n - 1;
    case 'paired-t':
      return p.pairs - 1;
    case 'two-sample-t':
      return p.n1 + p.n2 - 2;
    case 'chi-independence':
      return (p.rows - 1) * (p.cols - 1);
    case 'chi-gof':
      return p.categories - 1;
    case 'anova-between':
      return p.groups - 1;
    case 'anova-within':
      return p.groups * p.perGroup - p.groups;
    case 'anova-total':
      return p.groups * p.perGroup - 1;
  }
}

function renderAnova(p: Anova): DrillText {
  const k = p.groups;
  const total = k * p.perGroup;
  const label = { 'anova-between': '집단 간(처리)', 'anova-within': '집단 내(오차·잔차)', 'anova-total': '전체(총)' }[p.ask];
  const all = { 'anova-between': k - 1, 'anova-within': total - k, 'anova-total': total - 1 };
  return {
    prompt: `$${k}$개 집단(집단마다 $${p.perGroup}$개, 총 $N = ${total}$개 관측값)의 평균을 비교하는 일원분산분석에서 ${label} 자유도는?`,
    solution: [
      `집단 간 $df = k - 1 = ${k - 1}$, 집단 내 $df = N - k = ${total - k}$, 전체 $df = N - 1 = ${total - 1}$`,
      `(집단 간 + 집단 내 = 전체) → ${label}: $${solve(p)}$`,
    ].join('\n'),
    distractors: [
      ...Object.entries(all).filter(([ask]) => ask !== p.ask).map(([, v]) => formatNum(v)),
      formatNum(total),
      formatNum(k),
    ],
  };
}

function render(p: DofParams): DrillText {
  const ans = solve(p);
  switch (p.ask) {
    case 'one-sample-t':
      return {
        prompt: `크기 $n = ${p.n}$인 표본으로 모평균에 대한 단일표본 t-검정을 할 때 검정통계량의 자유도는?`,
        solution: `단일표본 t-검정: $df = n - 1 = ${p.n} - 1 = ${ans}$`,
        distractors: [formatNum(p.n), formatNum(p.n - 2), formatNum(p.n + 1)],
      };
    case 'paired-t':
      return {
        prompt: `같은 대상 $${p.pairs}$명의 처치 전·후 값을 비교하는 대응표본 t-검정의 자유도는?`,
        solution: `대응표본은 차이값 $d_i$ $${p.pairs}$개에 대한 단일표본 검정이므로 $df = n - 1 = ${ans}$ (독립 2표본처럼 $2n - 2$로 계산하지 않는다)`,
        distractors: [formatNum(2 * p.pairs - 2), formatNum(p.pairs), formatNum(2 * p.pairs - 1)],
      };
    case 'two-sample-t':
      return {
        prompt: `등분산을 가정한 독립 2표본 t-검정에서 두 표본의 크기가 $n_1 = ${p.n1}$, $n_2 = ${p.n2}$일 때 자유도는?`,
        solution: `$df = n_1 + n_2 - 2 = ${p.n1} + ${p.n2} - 2 = ${ans}$`,
        distractors: [formatNum(p.n1 + p.n2 - 1), formatNum(p.n1 + p.n2), formatNum(Math.min(p.n1, p.n2) - 1)],
      };
    case 'chi-independence':
      return {
        prompt: `$${p.rows} \\times ${p.cols}$ 분할표(총 $${p.total}$명)로 두 범주형 변수의 카이제곱 독립성 검정을 할 때 자유도는?`,
        solution: `$df = (r - 1)(c - 1) = (${p.rows} - 1)(${p.cols} - 1) = ${ans}$ (표본 크기와는 무관)`,
        distractors: [
          formatNum(p.rows * p.cols - 1),
          formatNum(p.rows - 1 + (p.cols - 1)),
          formatNum(p.total - 1),
          formatNum(p.rows * p.cols),
        ],
      };
    case 'chi-gof':
      return {
        prompt: `관측값 $${p.total}$개를 $${p.categories}$개 범주로 나누어, 미리 정해진 비율에 맞는지 카이제곱 적합도 검정을 할 때 자유도는? (추정한 모수 없음)`,
        solution: `$df = k - 1 = ${p.categories} - 1 = ${ans}$ (관측값 개수가 아니라 범주 수로 정해진다)`,
        distractors: [formatNum(p.categories), formatNum(p.total - 1), formatNum(p.categories - 2)],
      };
    default:
      return renderAnova(p);
  }
}

export const DOF: DrillFamily<DofParams> = {
  kind: 'dof',
  title: '자유도',
  topic: '2.3.2.3',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 1, rand, 1),
};
