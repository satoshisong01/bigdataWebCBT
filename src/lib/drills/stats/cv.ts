import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { hasDecimals, nearby, retry, tidy } from './shared';

export interface CvGroup {
  mean: number;
  sd: number;
}

export type CvParams =
  | { ask: 'single'; mean: number; sd: number; giveVariance: boolean }
  /** the group with the larger sd has the smaller CV (the classic trap) */
  | { ask: 'compare'; a: CvGroup; b: CvGroup };

/** means whose 100/mean terminates, so CV% stays tidy */
const SMALL_MEANS: readonly number[] = [20, 25, 40, 50, 80, 100];
const LARGE_MEANS: readonly number[] = [125, 200, 250, 400, 500];

export function cvPercent(g: CvGroup): number {
  return (100 * g.sd) / g.mean;
}

function tidyGroup(rand: Rand, means: readonly number[], maxSd: number): CvGroup {
  return retry(
    100,
    () => {
      const mean = pick(means, rand);
      const sd = randInt(rand, 1, Math.min(maxSd, mean / 2));
      return hasDecimals(cvPercent({ mean, sd }), 2) ? { mean, sd } : undefined;
    },
    { mean: 50, sd: 10 },
  );
}

function makeParams(rand: Rand): CvParams {
  if (rand() < 0.6) {
    const giveVariance = rand() < 0.35;
    const g = tidyGroup(rand, [...SMALL_MEANS, ...LARGE_MEANS], giveVariance ? 15 : 60);
    return { ask: 'single', ...g, giveVariance };
  }
  const pair = retry(
    100,
    () => {
      const small = tidyGroup(rand, SMALL_MEANS, 30);
      const large = tidyGroup(rand, LARGE_MEANS, 60);
      return large.sd > small.sd && cvPercent(small) > cvPercent(large) ? [small, large] : undefined;
    },
    [{ mean: 40, sd: 8 }, { mean: 200, sd: 20 }],
  );
  const [a, b] = rand() < 0.5 ? pair : [pair[1], pair[0]];
  return { ask: 'compare', a, b };
}

function solve(p: CvParams): number {
  return p.ask === 'single' ? cvPercent(p) : Math.max(cvPercent(p.a), cvPercent(p.b));
}

const cvLine = (g: CvGroup): string =>
  `\\dfrac{${g.sd}}{${g.mean}} \\times 100 = ${formatNum(cvPercent(g))}\\%`;

function render(p: CvParams): DrillText {
  if (p.ask === 'single') {
    const variance = p.sd * p.sd;
    const spread = p.giveVariance ? `분산이 $${variance}$` : `표준편차가 $${p.sd}$`;
    return {
      prompt: `평균이 $${p.mean}$, ${spread}인 자료의 변동계수(CV, %)는?`,
      solution: [
        ...(p.giveVariance ? [`표준편차 $s = \\sqrt{${variance}} = ${p.sd}$`] : []),
        `$\\mathrm{CV} = \\dfrac{s}{\\bar{x}} \\times 100 = ${cvLine(p)}$`,
      ].join('\n'),
      distractors: p.giveVariance
        ? [tidy((100 * variance) / p.mean), tidy(p.sd / p.mean), tidy((100 * p.mean) / p.sd)]
        : [tidy(p.sd / p.mean), tidy((100 * p.mean) / p.sd), tidy((100 * variance) / p.mean)],
    };
  }
  const [hi, lo] = cvPercent(p.a) > cvPercent(p.b) ? [p.a, p.b] : [p.b, p.a];
  const hiName = hi === p.a ? 'A' : 'B';
  return {
    prompt: [
      `집단 A: 평균 $${p.a.mean}$, 표준편차 $${p.a.sd}$`,
      `집단 B: 평균 $${p.b.mean}$, 표준편차 $${p.b.sd}$`,
      '상대적인 퍼짐(산포)이 더 큰 집단의 변동계수(%)는?',
    ].join('\n'),
    solution: [
      `A: $${cvLine(p.a)}$, B: $${cvLine(p.b)}$`,
      `평균이 다른 집단은 표준편차가 아니라 CV로 비교한다 → 집단 ${hiName}의 $${formatNum(cvPercent(hi))}\\%$`,
    ].join('\n'),
    distractors: [tidy(cvPercent(lo)), tidy(cvPercent(hi) / 100), tidy((100 * hi.mean) / hi.sd)],
  };
}

export const CV: DrillFamily<CvParams> = {
  kind: 'cv',
  title: '변동계수',
  topic: '2.3.1.1',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 5, rand, 0.5),
};
