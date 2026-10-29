import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, hasDecimals, nearby, retry, tidy } from './shared';
import { paren } from './tex';

export type ScalingParams =
  | { ask: 'z'; x: number; mu: number; sigma: number; giveVariance: boolean }
  | { ask: 'z-inverse'; z: number; mu: number; sigma: number }
  | { ask: 'minmax'; x: number; min: number; max: number }
  | { ask: 'minmax-inverse'; scaled: number; min: number; max: number };

type Ask = ScalingParams['ask'];
const ASKS: readonly Ask[] = ['z', 'z-inverse', 'minmax', 'minmax-inverse'];
const SIGMAS: readonly number[] = [2, 4, 5, 8, 10, 12, 15, 20];
const ZS: readonly number[] = [-2.5, -2, -1.5, -1.25, -1, -0.75, -0.5, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const RANGES: readonly number[] = [4, 5, 8, 10, 20, 25, 40, 50, 80, 100, 200];
const SCALED: readonly number[] = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9];

/** (z, σ) with an integer z·σ so the raw value is an integer. */
function zSigma(rand: Rand): { z: number; sigma: number } {
  return retry(
    100,
    () => {
      const z = pick(ZS, rand);
      const sigma = pick(SIGMAS, rand);
      return hasDecimals(z * sigma, 0) ? { z, sigma } : undefined;
    },
    { z: 1.5, sigma: 10 },
  );
}

function makeParams(rand: Rand): ScalingParams {
  const ask = pick(ASKS, rand);
  const min = randInt(rand, 0, 50);
  switch (ask) {
    case 'z': {
      const { z, sigma } = zSigma(rand);
      const mu = randInt(rand, 20, 100);
      return { ask, x: mu + z * sigma, mu, sigma, giveVariance: sigma <= 12 && rand() < 0.35 };
    }
    case 'z-inverse': {
      const { z, sigma } = zSigma(rand);
      return { ask, z, mu: randInt(rand, 20, 100), sigma };
    }
    case 'minmax': {
      const range = pick(RANGES, rand);
      const k = retry(50, () => {
        const c = randInt(rand, 1, range - 1);
        return hasDecimals(c / range, 3) ? c : undefined;
      }, range / 2);
      // min > 0 so that "divide by max" / "skip subtracting min" mistakes give different numbers
      const low = min + 5;
      return { ask, x: low + k, min: low, max: low + range };
    }
    case 'minmax-inverse':
      return { ask, scaled: pick(SCALED, rand), min, max: min + pick([10, 20, 40, 50, 100, 200], rand) };
  }
}

function solve(p: ScalingParams): number {
  switch (p.ask) {
    case 'z':
      return (p.x - p.mu) / p.sigma;
    case 'z-inverse':
      return p.mu + p.z * p.sigma;
    case 'minmax':
      return (p.x - p.min) / (p.max - p.min);
    case 'minmax-inverse':
      return clean(p.min + p.scaled * (p.max - p.min));
  }
}

function render(p: ScalingParams): DrillText {
  const ans = formatNum(solve(p));
  switch (p.ask) {
    case 'z': {
      const { x, mu, sigma } = p;
      const spread = p.giveVariance ? `분산이 $${sigma * sigma}$` : `표준편차가 $${sigma}$`;
      return {
        prompt: `평균이 $${mu}$, ${spread}인 분포에서 $x = ${x}$의 표준화 점수(Z-score)는?`,
        solution: [
          ...(p.giveVariance ? [`표준편차 $\\sigma = \\sqrt{${sigma * sigma}} = ${sigma}$ (분산이 아니라 표준편차로 나눈다)`] : []),
          `$z = \\dfrac{x - \\mu}{\\sigma} = \\dfrac{${x} - ${mu}}{${sigma}} = \\dfrac{${x - mu}}{${sigma}} = ${ans}$`,
        ].join('\n'),
        distractors: [formatNum(-solve(p)), tidy((x - mu) / (sigma * sigma)), tidy(x / sigma)],
      };
    }
    case 'z-inverse': {
      const { z, mu, sigma } = p;
      return {
        prompt: `평균이 $${mu}$, 표준편차가 $${sigma}$인 자료에서 Z-score가 $${formatNum(z)}$인 원래 값은?`,
        solution: `$x = \\mu + z\\sigma = ${mu} + ${paren(z)} \\times ${sigma} = ${ans}$`,
        distractors: [formatNum(mu - z * sigma), formatNum(z * sigma), tidy(mu + z)],
      };
    }
    case 'minmax': {
      const { x, min, max } = p;
      return {
        prompt: `최솟값이 $${min}$, 최댓값이 $${max}$인 변수에서 $x = ${x}$의 Min-Max 정규화($0 \\sim 1$) 값은?`,
        solution: `$x' = \\dfrac{x - x_{\\min}}{x_{\\max} - x_{\\min}} = \\dfrac{${x} - ${min}}{${max} - ${min}} = \\dfrac{${x - min}}{${max - min}} = ${ans}$`,
        distractors: [tidy((x - min) / max), tidy(1 - solve(p)), tidy(x / max), tidy(x / (max - min))],
      };
    }
    case 'minmax-inverse': {
      const { scaled, min, max } = p;
      return {
        prompt: `최솟값이 $${min}$, 최댓값이 $${max}$인 변수를 Min-Max 정규화($0 \\sim 1$)한 값이 $${formatNum(scaled)}$일 때, 원래 값은?`,
        solution: `$x = x_{\\min} + x'(x_{\\max} - x_{\\min}) = ${min} + ${formatNum(scaled)} \\times ${max - min} = ${ans}$`,
        distractors: [formatNum(scaled * (max - min)), formatNum(scaled * max), formatNum(max - scaled * (max - min))],
      };
    }
  }
}

export const SCALING: DrillFamily<ScalingParams> = {
  kind: 'scaling',
  title: 'Z-점수·Min-Max 정규화',
  topic: '2.1.2.4',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => {
    if (p.ask === 'z') return nearby(solve(p), 0.25, rand);
    if (p.ask === 'minmax') return nearby(solve(p), 0.05, rand, 0, 1);
    return nearby(solve(p), 1, rand);
  },
};
