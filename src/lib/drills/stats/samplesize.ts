import { pick, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, exact, hasDecimals, nearby, retry, tidy } from './shared';
import { HALF_ALPHA, Z_BY_LEVEL, type CiLevel } from './stderror';

export type SampleSizeParams =
  | { ask: 'mean'; level: CiLevel; sigma: number; e: number }
  | { ask: 'prop'; level: CiLevel; phat: number; e: number }
  /** margin of error E → E / factor */
  | { ask: 'error-scale'; factor: number }
  /** sample size n → n · factor² */
  | { ask: 'se-scale'; factor: number };

/** (level, zσ/E ratio) pairs whose square is reasonable by hand, e.g. 1.96 × 5 = 9.8 → 96.04 */
const RATIOS: readonly (readonly [CiLevel, number])[] = [
  [95, 2.5], [95, 5], [95, 7.5], [95, 10], [95, 15], [95, 25],
  [90, 2], [90, 4], [90, 10], [90, 20],
  [99, 2.5], [99, 5],
];
/** proportion cases: p̂ with a tidy √(p̂(1-p̂)) and a margin E = √(p̂(1-p̂)) / ratio of ≤ 3 decimals */
const PROP_CASES = RATIOS.flatMap(([level, ratio]) =>
  [0.1, 0.2, 0.5, 0.8, 0.9].map(phat => ({ level, phat, e: clean(Math.sqrt(phat * (1 - phat)) / ratio) })),
).filter(c => hasDecimals(c.e, 3));

/** (z·ratio)² rounded to float noise — the unrounded minimum n */
export function rawSampleSize(level: CiLevel, ratio: number): number {
  return clean(clean(Z_BY_LEVEL[level] * ratio) ** 2);
}

function ratioOf(p: Extract<SampleSizeParams, { ask: 'mean' | 'prop' }>): number {
  return p.ask === 'mean' ? clean(p.sigma / p.e) : clean(Math.sqrt(p.phat * (1 - p.phat)) / p.e);
}

function makeParams(rand: Rand): SampleSizeParams {
  const r = rand();
  if (r < 0.15) return { ask: 'error-scale', factor: pick([2, 3, 4, 5], rand) };
  if (r < 0.3) return { ask: 'se-scale', factor: pick([2, 4, 5, 10], rand) };
  if (r < 0.7) {
    const [level, ratio] = pick(RATIOS, rand);
    const e = retry(50, () => {
      const c = pick([1, 2, 4, 5], rand);
      return hasDecimals(ratio * c, 0) ? c : undefined;
    }, 2);
    return { ask: 'mean', level, sigma: ratio * e, e };
  }
  return { ask: 'prop', ...pick(PROP_CASES, rand) };
}

function solve(p: SampleSizeParams): number {
  if (p.ask === 'error-scale') return p.factor ** 2;
  if (p.ask === 'se-scale') return clean(1 / p.factor);
  return Math.ceil(rawSampleSize(p.level, ratioOf(p)));
}

function render(p: SampleSizeParams): DrillText {
  if (p.ask === 'error-scale') {
    const f = p.factor;
    return {
      prompt: `다른 조건이 같을 때, 모평균 추정의 오차한계(허용오차)를 $\\dfrac{1}{${f}}$로 줄이려면 표본 크기는 몇 배가 되어야 하는가?`,
      solution: [
        '$E = z\\dfrac{\\sigma}{\\sqrt{n}}$ 이므로 $n = \\left(\\dfrac{z\\sigma}{E}\\right)^2 \\propto \\dfrac{1}{E^2}$',
        `$E$를 $\\dfrac{1}{${f}}$로 줄이면 $n$은 $${f}^2 = ${f * f}$배`,
      ].join('\n'),
      distractors: [formatNum(f), formatNum(2 * f), formatNum(f ** 3)],
    };
  }
  if (p.ask === 'se-scale') {
    const f = p.factor;
    return {
      prompt: `다른 조건이 같을 때 표본 크기를 $${f * f}$배로 늘리면 표본평균의 표준오차는 몇 배가 되는가?`,
      solution: [
        '$\\mathrm{SE} = \\dfrac{\\sigma}{\\sqrt{n}}$ 이므로 $n$이 $k$배면 $\\mathrm{SE}$는 $\\dfrac{1}{\\sqrt{k}}$배',
        `$\\dfrac{1}{\\sqrt{${f * f}}} = \\dfrac{1}{${f}} = ${formatNum(1 / f)}$배`,
      ].join('\n'),
      distractors: [tidy(1 / (f * f)), formatNum(f), formatNum(f * f)],
    };
  }
  const z = Z_BY_LEVEL[p.level];
  const ratio = ratioOf(p);
  const zr = formatNum(clean(z * ratio));
  const raw = rawSampleSize(p.level, ratio);
  const ans = Math.ceil(raw);
  const given = `(단, $z_{${HALF_ALPHA[p.level]}} = ${z}$)`;
  const ceilLine = Number.isInteger(raw)
    ? `정확히 정수이므로 $n = ${ans}$`
    : `표본 크기는 정수이고 조건을 만족해야 하므로 올림 → $${ans}$`;
  const head = p.ask === 'mean'
    ? `모표준편차가 $${p.sigma}$인 모집단의 평균을 $${p.level}\\%$ 신뢰수준에서 오차한계 $${formatNum(p.e)}$ 이내로 추정하려 한다.`
    : `모비율을 $${p.level}\\%$ 신뢰수준에서 오차한계 $${formatNum(p.e)}$ 이내로 추정하려 한다. ${p.phat === 0.5 ? '사전 정보가 없어 $\\hat{p} = 0.5$를 사용할 때' : `사전 조사 결과 $\\hat{p} = ${formatNum(p.phat)}$일 때`}`;
  const steps = p.ask === 'mean'
    ? [`$n \\ge \\left(\\dfrac{z\\,\\sigma}{E}\\right)^2 = \\left(\\dfrac{${z} \\times ${p.sigma}}{${formatNum(p.e)}}\\right)^2 = ${zr}^2 = ${exact(raw)}$`]
    : [
      '$n \\ge \\dfrac{z^2\\,\\hat{p}(1-\\hat{p})}{E^2} = \\left(\\dfrac{z\\sqrt{\\hat{p}(1-\\hat{p})}}{E}\\right)^2$',
      `$\\sqrt{${formatNum(p.phat)} \\times ${formatNum(clean(1 - p.phat))}} = ${formatNum(clean(ratio * p.e))}$ → $\\left(\\dfrac{${z} \\times ${formatNum(clean(ratio * p.e))}}{${formatNum(p.e)}}\\right)^2 = ${zr}^2 = ${exact(raw)}$`,
    ];
  return {
    prompt: `${head} 필요한 최소 표본 크기는?\n${given}`,
    solution: [...steps, ceilLine].join('\n'),
    distractors: [
      formatNum(Math.floor(raw)),
      formatNum(Math.ceil(clean(z * ratio))),
      formatNum(Math.ceil(clean(ratio * ratio))),
      formatNum(Math.ceil(clean(z * ratio * ratio))),
    ],
  };
}

export const SAMPLE_SIZE: DrillFamily<SampleSizeParams> = {
  kind: 'sample-size',
  title: '표본 크기 결정',
  topic: '2.3.2.2',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => (p.ask === 'se-scale' ? nearby(solve(p), 0.05, rand, 0.01, 0.99) : nearby(solve(p), 1, rand, 1)),
};
