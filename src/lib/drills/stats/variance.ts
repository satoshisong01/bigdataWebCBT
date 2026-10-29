import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { hasDecimals, mean, nearby, retry, sum, tidy, zeroSumDeviations } from './shared';
import { texList } from './tex';

export type VarianceTarget = 'sample-var' | 'pop-var' | 'sample-sd' | 'pop-sd';

export interface VarianceParams {
  target: VarianceTarget;
  data: number[];
  /** show only n, Σx and Σx² instead of the raw data */
  summary: boolean;
}

const TARGETS: readonly VarianceTarget[] = ['sample-var', 'pop-var', 'sample-sd', 'pop-sd'];
const ASK: Record<VarianceTarget, string> = {
  'sample-var': '표본분산 $s^2$은',
  'pop-var': '모분산 $\\sigma^2$은',
  'sample-sd': '표본표준편차 $s$는',
  'pop-sd': '모표준편차 $\\sigma$는',
};
const FALLBACK_DATA: Record<VarianceTarget, number[]> = {
  'sample-var': [8, 9, 10, 11, 12],
  'pop-var': [8, 9, 10, 11, 12],
  'sample-sd': [8, 8, 10, 12, 12],
  'pop-sd': [8, 8, 12, 12],
};

interface Moments {
  n: number;
  mean: number;
  /** sum of squared deviations */
  ss: number;
  sampleVar: number;
  popVar: number;
}

export function moments(data: readonly number[]): Moments {
  const n = data.length;
  const m = mean(data);
  const ss = sum(data.map(x => (x - m) ** 2));
  return { n, mean: m, ss, sampleVar: ss / (n - 1), popVar: ss / n };
}

const isSample = (t: VarianceTarget): boolean => t.startsWith('sample');
const isSd = (t: VarianceTarget): boolean => t.endsWith('sd');

function makeData(target: VarianceTarget, rand: Rand): number[] {
  return retry(
    400,
    () => {
      const n = randInt(rand, 4, 6);
      const center = randInt(rand, 5, 20);
      const devs = zeroSumDeviations(rand, n, 5);
      const ss = sum(devs.map(d => d * d));
      const v = ss / (isSample(target) ? n - 1 : n);
      // sd targets need a tidy square root; variance targets keep both n and n-1 versions tidy
      const ok = isSd(target)
        ? hasDecimals(Math.sqrt(v), 1)
        : hasDecimals(ss / (n - 1), 2) && hasDecimals(ss / n, 2);
      return ok ? devs.map(d => center + d) : undefined;
    },
    FALLBACK_DATA[target],
  );
}

function solve(p: VarianceParams): number {
  const m = moments(p.data);
  const v = isSample(p.target) ? m.sampleVar : m.popVar;
  return isSd(p.target) ? Math.sqrt(v) : v;
}

function distractors(target: VarianceTarget, m: Moments): string[] {
  const root = (x: number): string => tidy(Math.sqrt(x));
  switch (target) {
    case 'sample-var':
      return [tidy(m.popVar), formatNum(m.ss), root(m.sampleVar)];
    case 'pop-var':
      return [tidy(m.sampleVar), formatNum(m.ss), root(m.popVar)];
    case 'sample-sd':
      return [tidy(m.sampleVar), formatNum(Math.sqrt(m.popVar)), root(m.ss), tidy(m.popVar)];
    case 'pop-sd':
      return [tidy(m.popVar), formatNum(Math.sqrt(m.sampleVar)), root(m.ss), tidy(m.sampleVar)];
  }
}

function render(p: VarianceParams): DrillText {
  const m = moments(p.data);
  const sample = isSample(p.target);
  const sx = sum(p.data);
  const sxx = sum(p.data.map(x => x * x));
  const bar = sample ? '\\bar{x}' : '\\mu';
  const size = sample ? 'n' : 'N';
  const prompt = p.summary
    ? `크기 $${size} = ${m.n}$인 ${sample ? '표본' : '모집단'}에서 $\\sum x = ${sx}$, $\\sum x^2 = ${sxx}$이다. ${ASK[p.target]}?`
    : `${sample ? '다음 표본 자료의' : '다음은 모집단 전체 자료이다. 이 모집단의'} ${ASK[p.target]}?\n$${texList(p.data)}$`;
  const ssLine = p.summary
    ? `편차제곱합 $= \\sum x^2 - \\dfrac{(\\sum x)^2}{${size}} = ${sxx} - \\dfrac{${sx}^2}{${m.n}} = ${formatNum(m.ss)}$`
    : `편차제곱합 $\\sum (x_i - ${bar})^2 = ${p.data.map(x => formatNum((x - m.mean) ** 2)).join(' + ')} = ${formatNum(m.ss)}$`;
  const v = sample ? m.sampleVar : m.popVar;
  const varLine = sample
    ? `표본분산 $s^2 = \\dfrac{${formatNum(m.ss)}}{${m.n} - 1} = ${formatNum(v)}$ (표본은 $n-1$로 나눈다)`
    : `모분산 $\\sigma^2 = \\dfrac{${formatNum(m.ss)}}{${m.n}} = ${formatNum(v)}$ (모집단은 $N$으로 나눈다)`;
  const sdLine = isSd(p.target) ? [`표준편차 $= \\sqrt{${formatNum(v)}} = ${formatNum(Math.sqrt(v))}$`] : [];
  return {
    prompt,
    solution: [`평균 $${bar} = \\dfrac{${sx}}{${m.n}} = ${formatNum(m.mean)}$`, ssLine, varLine, ...sdLine].join('\n'),
    distractors: distractors(p.target, m),
  };
}

export const VARIANCE: DrillFamily<VarianceParams> = {
  kind: 'variance',
  title: '분산·표준편차',
  topic: '2.3.1.1',
  makeParams(rand) {
    const target = pick(TARGETS, rand);
    const data = makeData(target, rand);
    return { target, data, summary: rand() < 0.35 };
  },
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 0.5, rand, 0.5),
};
