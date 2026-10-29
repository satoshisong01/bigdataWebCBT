import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, composition, hasDecimals, nearby, retry, sum, tidy } from './shared';
import { texContingency } from './tex';

export type ChiParams =
  | { ask: 'expected'; context: number; observed: number[][]; row: number; col: number }
  /** 2×2 table */
  | { ask: 'statistic'; context: number; observed: number[][] };

interface Context {
  what: string;
  rows: readonly string[];
  cols: readonly string[];
}

const CONTEXTS: readonly Context[] = [
  { what: '성별과 정책 찬반', rows: ['남성', '여성'], cols: ['찬성', '반대'] },
  { what: '흡연 여부와 질환 유무', rows: ['흡연', '비흡연'], cols: ['질환 있음', '질환 없음'] },
  { what: '광고 유형과 클릭 여부', rows: ['A 광고', 'B 광고'], cols: ['클릭', '미클릭'] },
  { what: '성별과 의견', rows: ['남성', '여성'], cols: ['찬성', '반대', '보류'] },
  { what: '연령대와 구매 여부', rows: ['20대', '30대', '40대'], cols: ['구매', '비구매'] },
];
const SQUARE_CONTEXTS = [0, 1, 2];

/** Expected counts under independence: rowTotal × colTotal / N. */
export function expectedCounts(observed: readonly (readonly number[])[]): number[][] {
  const rowTotals = observed.map(r => sum(r));
  const colTotals = observed[0].map((_, j) => sum(observed.map(r => r[j])));
  const total = sum(rowTotals);
  return observed.map((r, i) => r.map((_, j) => clean((rowTotals[i] * colTotals[j]) / total)));
}

export function chiSquare(observed: readonly (readonly number[])[]): number {
  const expected = expectedCounts(observed);
  return clean(sum(observed.flatMap((r, i) => r.map((o, j) => (o - expected[i][j]) ** 2 / expected[i][j]))));
}

/** Integer expected table N·a_i·b_j/100 from weights summing to 10 (N a multiple of 100). */
function expectedTable(rand: Rand, rows: number, cols: number, total: number): number[][] {
  const a = composition(rand, 10, rows);
  const b = composition(rand, 10, cols);
  return a.map(ai => b.map(bj => (total * ai * bj) / 100));
}

/** Shifts cells while keeping every row and column total (δ at (i,j) is balanced in row 0 / column 0). */
function perturb(expected: readonly (readonly number[])[], deltas: readonly (readonly number[])[]): number[][] {
  const d = (i: number, j: number): number => deltas[i - 1][j - 1];
  const rows = expected.length;
  const cols = expected[0].length;
  const range = (n: number): number[] => Array.from({ length: n - 1 }, (_, k) => k + 1);
  return expected.map((r, i) =>
    r.map((e, j) => {
      if (i > 0 && j > 0) return e + d(i, j);
      if (i === 0 && j > 0) return e - sum(range(rows).map(ii => d(ii, j)));
      if (i > 0) return e - sum(range(cols).map(jj => d(i, jj)));
      return e + sum(range(rows).flatMap(ii => range(cols).map(jj => d(ii, jj))));
    }),
  );
}

function makeObserved(rand: Rand, ctx: Context, square: boolean): number[][] {
  const rows = ctx.rows.length;
  const cols = ctx.cols.length;
  return retry(
    300,
    () => {
      const total = pick(square ? [100, 200, 400] : [100, 200, 300, 400, 500], rand);
      const expected = expectedTable(rand, rows, cols, total);
      const deltas = Array.from({ length: rows - 1 }, () => Array.from({ length: cols - 1 }, () => randInt(rand, -12, 12)));
      const observed = perturb(expected, deltas);
      if (observed.some(r => r.some(o => o < 1))) return undefined;
      if (!square) return observed;
      const chi = chiSquare(observed);
      return chi >= 0.5 && chi <= 30 && hasDecimals(chi, 3) ? observed : undefined;
    },
    square
      ? [[30, 20], [20, 30]]
      : Array.from({ length: rows }, () => Array.from({ length: cols }, (_, j) => 10 * (cols - j))),
  );
}

function makeParams(rand: Rand): ChiParams {
  if (rand() < 0.6) {
    const context = randInt(rand, 0, CONTEXTS.length - 1);
    const ctx = CONTEXTS[context];
    return {
      ask: 'expected',
      context,
      observed: makeObserved(rand, ctx, false),
      row: randInt(rand, 0, ctx.rows.length - 1),
      col: randInt(rand, 0, ctx.cols.length - 1),
    };
  }
  const context = pick(SQUARE_CONTEXTS, rand);
  return { ask: 'statistic', context, observed: makeObserved(rand, CONTEXTS[context], true) };
}

function solve(p: ChiParams): number {
  return p.ask === 'expected' ? expectedCounts(p.observed)[p.row][p.col] : chiSquare(p.observed);
}

function render(p: ChiParams): DrillText {
  const ctx = CONTEXTS[p.context];
  const table = texContingency(ctx.rows, ctx.cols, p.observed);
  const expected = expectedCounts(p.observed);
  const total = sum(p.observed.map(r => sum(r)));
  if (p.ask === 'expected') {
    const rowTotal = sum(p.observed[p.row]);
    const colTotal = sum(p.observed.map(r => r[p.col]));
    const cellCount = ctx.rows.length * ctx.cols.length;
    return {
      prompt: [
        `다음은 ${ctx.what}에 대한 분할표(관측도수)이다.`,
        `두 변수가 독립이라고 가정할 때 (${ctx.rows[p.row]}, ${ctx.cols[p.col]}) 칸의 기대도수는?`,
        `$${table}$`,
      ].join('\n'),
      solution: [
        '기대도수 $E_{ij} = \\dfrac{(i\\text{행 합}) \\times (j\\text{열 합})}{\\text{총합}}$',
        `$= \\dfrac{${rowTotal} \\times ${colTotal}}{${total}} = ${formatNum(expected[p.row][p.col])}$`,
      ].join('\n'),
      distractors: [
        formatNum(p.observed[p.row][p.col]),
        tidy(total / cellCount),
        tidy(rowTotal / ctx.cols.length),
        tidy(colTotal / ctx.rows.length),
      ],
    };
  }
  const cells = p.observed.flatMap((r, i) => r.map((o, j) => ({ o, e: expected[i][j] })));
  const d = Math.abs(cells[0].o - cells[0].e);
  return {
    prompt: [
      `다음은 ${ctx.what}에 대한 $2 \\times 2$ 분할표(관측도수)이다.`,
      '독립성 검정의 카이제곱 통계량 $\\chi^2$ 값은? (연속성 수정 없음)',
      `$${table}$`,
    ].join('\n'),
    solution: [
      `기대도수(행 합 × 열 합 ÷ 총합): $${cells.map((c, k) => `E_{${Math.floor(k / 2) + 1}${(k % 2) + 1}} = ${formatNum(c.e)}`).join(',\\ ')}$`,
      `모든 칸에서 $|O - E| = ${formatNum(d)}$`,
      `$\\chi^2 = \\sum \\dfrac{(O - E)^2}{E} = ${cells.map(c => `\\dfrac{${formatNum(d * d)}}{${formatNum(c.e)}}`).join(' + ')} = ${formatNum(chiSquare(p.observed))}$`,
    ].join('\n'),
    distractors: [
      formatNum(4 * d * d),
      tidy(sum(cells.map(c => d / c.e))),
      tidy((d * d) / cells[0].e),
      tidy(sum(cells.map(c => (d * d) / c.o))),
    ],
  };
}

export const CHI_EXPECTED: DrillFamily<ChiParams> = {
  kind: 'chi-expected',
  title: '카이제곱 기대도수·통계량',
  topic: '3.1.2.1',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), p.ask === 'expected' ? 2 : 0.5, rand, 0.5),
};
