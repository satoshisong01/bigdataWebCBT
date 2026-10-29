import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { nearby, sortAsc, tidy } from './shared';
import { texList } from './tex';

export type QuartileParams =
  /** data size is 4k + 3 (7 or 11) so every common quartile rule agrees */
  | { ask: 'iqr'; data: number[] }
  | { ask: 'upper-fence' | 'lower-fence'; q1: number; q3: number }
  | { ask: 'outlier-count'; q1: number; q3: number; values: number[] };

type Ask = QuartileParams['ask'];
const ASKS: readonly Ask[] = ['iqr', 'upper-fence', 'lower-fence', 'outlier-count'];

/** Q1/Q3 = medians of the lower/upper half excluding the median; requires n = 4k + 3. */
export function quartiles(data: readonly number[]): { q1: number; median: number; q3: number } {
  const s = sortAsc(data);
  const k = (s.length - 3) / 4;
  return { q1: s[k], median: s[2 * k + 1], q3: s[3 * k + 2] };
}

export function fences(q1: number, q3: number, mult = 1.5): { lower: number; upper: number } {
  const iqr = q3 - q1;
  return { lower: q1 - mult * iqr, upper: q3 + mult * iqr };
}

function makeParams(rand: Rand): QuartileParams {
  const ask = pick(ASKS, rand);
  if (ask === 'iqr') {
    const start = randInt(rand, 1, 20);
    const steps = Array.from({ length: pick([7, 11], rand) }, () => randInt(rand, 1, 6));
    const sorted = steps.reduce<number[]>((acc, st) => [...acc, (acc.length ? acc[acc.length - 1] : start) + st], []);
    return { ask, data: shuffleWith(sorted, rand) };
  }
  const iqr = 2 * randInt(rand, 2, 12);
  if (ask === 'outlier-count') {
    // keep every value positive: Q1 > 2.5·IQR
    const q1 = randInt(rand, 2.5 * iqr + 1, 2.5 * iqr + 40);
    const { lower, upper } = fences(q1, q1 + iqr);
    const values = Array.from({ length: 6 }, () => {
      const r = rand();
      if (r < 0.3) return lower - randInt(rand, 1, iqr);
      if (r < 0.6) return upper + randInt(rand, 1, iqr);
      return randInt(rand, lower + 1, upper - 1);
    });
    return { ask, q1, q3: q1 + iqr, values: sortAsc(values) };
  }
  const q1 = randInt(rand, 10, 60);
  return { ask, q1, q3: q1 + iqr };
}

function solve(p: QuartileParams): number {
  if (p.ask === 'iqr') {
    const { q1, q3 } = quartiles(p.data);
    return q3 - q1;
  }
  const { lower, upper } = fences(p.q1, p.q3);
  if (p.ask === 'outlier-count') return p.values.filter(v => v < lower || v > upper).length;
  return p.ask === 'upper-fence' ? upper : lower;
}

function renderIqr(data: readonly number[]): DrillText {
  const s = sortAsc(data);
  const n = s.length;
  const k = (n - 3) / 4;
  const { q1, median, q3 } = quartiles(data);
  // Tukey hinges (median included in both halves) — a common alternative mistake here
  const hinge = (s[3 * k + 1] + s[3 * k + 2]) / 2 - (s[k] + s[k + 1]) / 2;
  return {
    prompt: [
      '다음 자료의 사분위수 범위(IQR)는?',
      `$${texList(data)}$`,
      '(단, $Q_1$·$Q_3$는 중앙값을 제외한 아래쪽·위쪽 절반 자료의 중앙값으로 구한다.)',
    ].join('\n'),
    solution: [
      `크기순 정렬($n = ${n}$): $${texList(s)}$`,
      `중앙값 $= ${median}$ → 아래쪽 절반 $${texList(s.slice(0, 2 * k + 1))}$의 중앙값 $Q_1 = ${q1}$`,
      `위쪽 절반 $${texList(s.slice(2 * k + 2))}$의 중앙값 $Q_3 = ${q3}$`,
      `$\\mathrm{IQR} = Q_3 - Q_1 = ${q3} - ${q1} = ${q3 - q1}$`,
    ].join('\n'),
    distractors: [tidy((q3 - q1) / 2), formatNum(s[n - 1] - s[0]), formatNum(q3 - median), tidy(hinge), formatNum(median - q1)],
  };
}

function render(p: QuartileParams): DrillText {
  if (p.ask === 'iqr') return renderIqr(p.data);
  const { q1, q3 } = p;
  const iqr = q3 - q1;
  const { lower, upper } = fences(q1, q3);
  const iqrLine = `$\\mathrm{IQR} = Q_3 - Q_1 = ${q3} - ${q1} = ${iqr}$`;
  const given = `$Q_1 = ${q1}$, $Q_3 = ${q3}$`;
  if (p.ask === 'outlier-count') {
    const outs = p.values.filter(v => v < lower || v > upper);
    const extreme = fences(q1, q3, 3);
    return {
      prompt: `${given}인 자료에서 다음 값 중 상자그림의 1.5 IQR 규칙으로 이상치에 해당하는 것은 몇 개인가?\n$${texList(p.values)}$`,
      solution: [
        iqrLine,
        `하한 $= Q_1 - 1.5 \\times \\mathrm{IQR} = ${q1} - ${formatNum(1.5 * iqr)} = ${formatNum(lower)}$`,
        `상한 $= Q_3 + 1.5 \\times \\mathrm{IQR} = ${q3} + ${formatNum(1.5 * iqr)} = ${formatNum(upper)}$`,
        outs.length ? `범위를 벗어난 값: $${texList(outs)}$ → $${outs.length}$개` : '범위를 벗어난 값이 없다 → $0$개',
      ].join('\n'),
      distractors: [
        formatNum(p.values.filter(v => v < q1 || v > q3).length),
        formatNum(p.values.filter(v => v < extreme.lower || v > extreme.upper).length),
        formatNum(p.values.filter(v => v > upper).length),
        formatNum(p.values.filter(v => v < lower).length),
      ],
    };
  }
  const upperAsk = p.ask === 'upper-fence';
  return {
    prompt: `어떤 변수의 ${given}이다. 상자그림(1.5 IQR 규칙)에서 이상치 판정의 ${upperAsk ? '상한(위 울타리)' : '하한(아래 울타리)'}은?`,
    solution: [
      iqrLine,
      upperAsk
        ? `상한 $= Q_3 + 1.5 \\times \\mathrm{IQR} = ${q3} + 1.5 \\times ${iqr} = ${formatNum(upper)}$`
        : `하한 $= Q_1 - 1.5 \\times \\mathrm{IQR} = ${q1} - 1.5 \\times ${iqr} = ${formatNum(lower)}$`,
      `(이 경계를 벗어나는 값이 이상치, $3 \\times \\mathrm{IQR}$ 경계는 극단 이상치 기준)`,
    ].join('\n'),
    distractors: upperAsk
      ? [formatNum(q3 + iqr), formatNum(q3 + 3 * iqr), formatNum(q1 + 1.5 * iqr), tidy(2.5 * q3)]
      : [formatNum(q1 - iqr), formatNum(q1 - 3 * iqr), formatNum(q3 - 1.5 * iqr), tidy(-0.5 * q1)],
  };
}

export const QUARTILE: DrillFamily<QuartileParams> = {
  kind: 'quartile-iqr',
  title: '사분위수·IQR·이상치',
  topic: '2.1.1.3',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => (p.ask === 'outlier-count' ? nearby(solve(p), 1, rand, 0, 6) : nearby(solve(p), 2, rand)),
};
