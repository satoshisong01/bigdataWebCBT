import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { mean, nearby, retry, sortAsc, sum, tidy, zeroSumDeviations } from './shared';
import { texList } from './tex';

export type DescriptiveStat = 'mean' | 'median' | 'mode' | 'range';

export interface DescriptiveParams {
  stat: DescriptiveStat;
  /** data in display (unsorted) order */
  data: number[];
}

const STATS: readonly DescriptiveStat[] = ['mean', 'median', 'mode', 'range'];
const ASK: Record<DescriptiveStat, string> = {
  mean: '산술평균은',
  median: '중앙값은',
  mode: '최빈값은',
  range: '범위는',
};

export function median(xs: readonly number[]): number {
  const s = sortAsc(xs);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function frequencies(xs: readonly number[]): Map<number, number> {
  return xs.reduce((acc, x) => new Map(acc).set(x, (acc.get(x) ?? 0) + 1), new Map<number, number>());
}

/** [value, count] pairs, most frequent first. */
function ranked(xs: readonly number[]): [number, number][] {
  return [...frequencies(xs).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
}

function makeData(stat: DescriptiveStat, rand: Rand): number[] {
  if (stat === 'mean') {
    const center = randInt(rand, 8, 30);
    return zeroSumDeviations(rand, randInt(rand, 5, 8), 6).map(d => center + d);
  }
  if (stat === 'mode') {
    // the mode appears 3 times, a runner-up twice, the rest once
    const [mode, runnerUp, ...rest] = shuffleWith(Array.from({ length: 30 }, (_, i) => i + 1), rand);
    return shuffleWith([mode, mode, mode, runnerUp, runnerUp, ...rest.slice(0, randInt(rand, 3, 5))], rand);
  }
  const n = randInt(rand, 5, 8);
  return retry(
    50,
    () => {
      const data = Array.from({ length: n }, () => randInt(rand, 1, stat === 'range' ? 60 : 40));
      const s = sortAsc(data);
      // "forgot to sort" must give a different (wrong) answer
      const misleading = stat === 'median'
        ? data[Math.floor(n / 2)] !== median(data)
        : Math.abs(data[n - 1] - data[0]) !== s[n - 1] - s[0];
      return misleading ? data : undefined;
    },
    [23, 5, 41, 12, 30],
  );
}

function solve(p: DescriptiveParams): number {
  switch (p.stat) {
    case 'mean':
      return mean(p.data);
    case 'median':
      return median(p.data);
    case 'mode':
      return ranked(p.data)[0][0];
    case 'range':
      return Math.max(...p.data) - Math.min(...p.data);
  }
}

function renderMedian(data: readonly number[], ans: number): Pick<DrillText, 'solution' | 'distractors'> {
  const s = sortAsc(data);
  const n = s.length;
  const mid = Math.floor(n / 2);
  const rule = n % 2 === 1
    ? `$n = ${n}$(홀수) → $\\dfrac{n+1}{2} = ${mid + 1}$번째 값: $${formatNum(ans)}$`
    : `$n = ${n}$(짝수) → $${mid}$번째와 $${mid + 1}$번째 값의 평균: $\\dfrac{${s[mid - 1]} + ${s[mid]}}{2} = ${formatNum(ans)}$`;
  const neighbours = n % 2 === 1 ? [s[mid - 1], s[mid + 1]] : [s[mid - 1], s[mid]];
  return {
    solution: [`크기순으로 정렬: $${texList(s)}$`, rule, '(정렬하지 않은 채 가운데 값을 고르면 틀린다)'].join('\n'),
    distractors: [formatNum(data[mid]), tidy(mean(data), 1), ...neighbours.map(v => formatNum(v))],
  };
}

function render(p: DescriptiveParams): DrillText {
  const { data } = p;
  const n = data.length;
  const s = sortAsc(data);
  const ans = solve(p);
  const prompt = `다음 자료의 ${ASK[p.stat]}?\n$${texList(data)}$`;
  switch (p.stat) {
    case 'mean':
      return {
        prompt,
        solution: `$\\bar{x} = \\dfrac{\\sum x_i}{n} = \\dfrac{${sum(data)}}{${n}} = ${formatNum(ans)}$`,
        distractors: [tidy(median(data), 1), tidy((s[0] + s[n - 1]) / 2, 1), tidy(sum(data) / (n - 1), 2)],
      };
    case 'median':
      return { prompt, ...renderMedian(data, ans) };
    case 'mode': {
      const [[, top], [runnerUp]] = ranked(data);
      return {
        prompt,
        solution: [
          `가장 많이 나온 값은 $${formatNum(ans)}$ ($${top}$회)이다.`,
          `최빈값은 빈도($${top}$)가 아니라 그 값 자체($${formatNum(ans)}$)이다.`,
        ].join('\n'),
        distractors: [formatNum(top), formatNum(runnerUp), tidy(median(data), 1), tidy(mean(data), 1)],
      };
    }
    case 'range':
      return {
        prompt,
        solution: [
          `범위 $= \\max - \\min = ${s[n - 1]} - ${s[0]} = ${formatNum(ans)}$`,
          '(정렬하지 않고 첫 값과 끝 값을 빼면 틀린다)',
        ].join('\n'),
        distractors: [
          formatNum(Math.abs(data[n - 1] - data[0])),
          formatNum(ans + 1),
          formatNum(s[n - 1]),
          formatNum(s[n - 2] - s[1]),
        ],
      };
  }
}

export const DESCRIPTIVE: DrillFamily<DescriptiveParams> = {
  kind: 'descriptive',
  title: '평균·중앙값·최빈값·범위',
  topic: '2.3.1.1',
  makeParams(rand) {
    const stat = pick(STATS, rand);
    return { stat, data: makeData(stat, rand) };
  },
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 1, rand, 0),
};
