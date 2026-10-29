import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, hasDecimals, nearby, retry, tidy } from './shared';

export type CiLevel = 90 | 95 | 99;

export const Z_BY_LEVEL: Record<CiLevel, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };
/** upper-tail probability α/2 for each level, as printed in z_{α/2} */
export const HALF_ALPHA: Record<CiLevel, string> = { 90: '0.05', 95: '0.025', 99: '0.005' };
const Z_TABLE = '(단, $z_{0.05} = 1.645$, $z_{0.025} = 1.96$, $z_{0.005} = 2.576$)';

export type StdErrorParams =
  | { ask: 'se'; sigma: number; n: number }
  | { ask: 'se-prop'; phat: number; n: number }
  | { ask: 'ci-lower' | 'ci-upper' | 'moe' | 'width'; mean: number; sigma: number; n: number; level: CiLevel };

type CiParams = Extract<StdErrorParams, { ask: 'ci-lower' | 'ci-upper' | 'moe' | 'width' }>;

const ASKS: readonly StdErrorParams['ask'][] = ['se', 'se-prop', 'ci-lower', 'ci-upper', 'moe', 'width'];
const LEVELS: readonly CiLevel[] = [90, 95, 99];
const ROOTS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
/** (p̂, n) whose standard error terminates within 3 decimals */
const PROP_CASES = [0.1, 0.2, 0.5, 0.8, 0.9]
  .flatMap(phat => [5, 10, 20, 25, 30, 40, 50].map(root => ({ phat, n: root * root })))
  .filter(({ phat, n }) => hasDecimals(Math.sqrt(phat * (1 - phat) / n), 3));

function makeParams(rand: Rand): StdErrorParams {
  const ask = pick(ASKS, rand);
  if (ask === 'se-prop') return { ask, ...pick(PROP_CASES, rand) };
  if (ask === 'se') {
    return retry(
      100,
      () => {
        const root = pick(ROOTS, rand);
        const se = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5], rand);
        return hasDecimals(se * root, 0) ? { ask, sigma: se * root, n: root * root } : undefined;
      },
      { ask, sigma: 10, n: 25 },
    );
  }
  const root = pick(ROOTS, rand);
  return { ask, mean: randInt(rand, 20, 200), sigma: randInt(rand, 1, 5) * root, n: root * root, level: pick(LEVELS, rand) };
}

function standardError(sigma: number, n: number): number {
  return clean(sigma / Math.sqrt(n));
}

function solve(p: StdErrorParams): number {
  if (p.ask === 'se') return standardError(p.sigma, p.n);
  if (p.ask === 'se-prop') return clean(Math.sqrt((p.phat * (1 - p.phat)) / p.n));
  const moe = clean(Z_BY_LEVEL[p.level] * standardError(p.sigma, p.n));
  switch (p.ask) {
    case 'ci-lower':
      return clean(p.mean - moe);
    case 'ci-upper':
      return clean(p.mean + moe);
    case 'moe':
      return moe;
    case 'width':
      return clean(2 * moe);
  }
}

function renderCi(p: CiParams): DrillText {
  const z = Z_BY_LEVEL[p.level];
  const se = standardError(p.sigma, p.n);
  const moe = clean(z * se);
  const otherZs = LEVELS.filter(l => l !== p.level).map(l => Z_BY_LEVEL[l]);
  const label = { 'ci-lower': '하한은', 'ci-upper': '상한은', moe: '오차한계(허용오차)는', width: '폭(상한 − 하한)은' }[p.ask];
  const ans = formatNum(solve(p));
  const last = {
    'ci-lower': `하한 $= \\bar{x} - ${formatNum(moe)} = ${p.mean} - ${formatNum(moe)} = ${ans}$`,
    'ci-upper': `상한 $= \\bar{x} + ${formatNum(moe)} = ${p.mean} + ${formatNum(moe)} = ${ans}$`,
    moe: `오차한계는 $${ans}$`,
    width: `폭 $= 2 \\times ${formatNum(moe)} = ${ans}$`,
  }[p.ask];
  const shift = (m: number): number => (p.ask === 'ci-lower' ? p.mean - m : p.ask === 'ci-upper' ? p.mean + m : p.ask === 'width' ? 2 * m : m);
  const distractors = [
    ...otherZs.map(oz => tidy(shift(oz * se))),
    tidy(shift(z * p.sigma)),
    p.ask === 'width' ? tidy(moe) : p.ask === 'moe' ? tidy(2 * moe) : tidy(p.ask === 'ci-lower' ? p.mean + moe : p.mean - moe),
    tidy(shift((z * p.sigma) / p.n)),
  ];
  return {
    prompt: [
      `모표준편차가 $${p.sigma}$인 모집단에서 크기 $${p.n}$인 표본을 뽑았다(표본평균 $\\bar{x} = ${p.mean}$).`,
      `모평균의 $${p.level}\\%$ 신뢰구간의 ${label}?`,
      Z_TABLE,
    ].join('\n'),
    solution: [
      `$${p.level}\\%$ 신뢰수준 → $z_{${HALF_ALPHA[p.level]}} = ${z}$`,
      `표준오차 $= \\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${p.sigma}}{\\sqrt{${p.n}}} = ${formatNum(se)}$`,
      `오차한계 $= z \\times \\mathrm{SE} = ${z} \\times ${formatNum(se)} = ${formatNum(moe)}$`,
      last,
    ].join('\n'),
    distractors,
  };
}

function render(p: StdErrorParams): DrillText {
  const ans = formatNum(solve(p));
  if (p.ask === 'se') {
    const root = Math.sqrt(p.n);
    return {
      prompt: `모표준편차가 $${p.sigma}$인 모집단에서 크기 $${p.n}$인 표본을 뽑을 때, 표본평균 $\\bar{X}$의 표준오차는?`,
      solution: `$\\mathrm{SE}(\\bar{X}) = \\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${p.sigma}}{\\sqrt{${p.n}}} = \\dfrac{${p.sigma}}{${root}} = ${ans}$`,
      distractors: [tidy(p.sigma / p.n), tidy((p.sigma * p.sigma) / p.n), formatNum(p.sigma), formatNum(p.sigma * root)],
    };
  }
  if (p.ask === 'se-prop') {
    const pq = clean(p.phat * (1 - p.phat));
    const root = Math.sqrt(p.n);
    return {
      prompt: `크기 $${p.n}$인 표본에서 표본비율이 $\\hat{p} = ${formatNum(p.phat)}$일 때, $\\hat{p}$의 표준오차는?`,
      solution: [
        `$\\mathrm{SE}(\\hat{p}) = \\sqrt{\\dfrac{\\hat{p}(1-\\hat{p})}{n}} = \\dfrac{\\sqrt{${formatNum(p.phat)} \\times ${formatNum(clean(1 - p.phat))}}}{\\sqrt{${p.n}}}$`,
        `$= \\dfrac{\\sqrt{${formatNum(pq)}}}{${root}} = \\dfrac{${formatNum(Math.sqrt(pq))}}{${root}} = ${ans}$`,
      ].join('\n'),
      distractors: [tidy(pq / p.n), tidy(Math.sqrt(p.phat / p.n)), tidy(Math.sqrt(pq)), tidy(pq / root)],
    };
  }
  return renderCi(p);
}

export const STD_ERROR: DrillFamily<StdErrorParams> = {
  kind: 'std-error-ci',
  title: '표준오차·신뢰구간',
  topic: '2.3.2.2',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), p.ask === 'se-prop' ? 0.005 : 0.5, rand, 0.001),
};
