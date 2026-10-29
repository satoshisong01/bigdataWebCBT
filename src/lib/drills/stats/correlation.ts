import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, hasDecimals, mean, nearby, retry, sum, tidy } from './shared';
import { joinSum, texRows } from './tex';

export type CorrelationParams =
  | { ask: 'cov' | 'r'; xs: number[]; ys: number[] }
  | { ask: 'r-summary'; cov: number; sx: number; sy: number; giveVariance: boolean };

type DataParams = Extract<CorrelationParams, { ask: 'cov' | 'r' }>;

const R_VALUES: readonly number[] = [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8];

export interface CoMoments {
  n: number;
  sxx: number;
  syy: number;
  sxy: number;
}

export function coMoments(xs: readonly number[], ys: readonly number[]): CoMoments {
  const mx = mean(xs);
  const my = mean(ys);
  return {
    n: xs.length,
    sxx: clean(sum(xs.map(x => (x - mx) ** 2))),
    syy: clean(sum(ys.map(y => (y - my) ** 2))),
    sxy: clean(sum(xs.map((x, i) => (x - mx) * (ys[i] - my)))),
  };
}

export function pearson(m: CoMoments): number {
  return clean(m.sxy / Math.sqrt(m.sxx * m.syy));
}

/**
 * y-deviations are a signed permutation of the x-deviations (scaled by 1 or 2), so
 * √(Sxx·Syy) is an integer and r = Σdx·dy / Sxx terminates.
 */
function makeData(ask: 'cov' | 'r', rand: Rand): DataParams {
  return retry(
    200,
    () => {
      const base = pick([[-2, -1, 0, 1, 2], [-3, -1, 1, 3]], rand);
      const sign = rand() < 0.3 ? -1 : 1;
      const dy = shuffleWith(base, rand).map(d => sign * d);
      const ky = pick([1, 2], rand);
      const sxx = sum(base.map(d => d * d));
      const dot = sum(base.map((d, i) => d * dy[i]));
      const cov = (ky * dot) / (base.length - 1);
      // skip r = 0 / ±1 and (when asked) covariances that do not terminate
      if (dot === 0 || Math.abs(dot) === sxx || (ask === 'cov' && !hasDecimals(cov, 3))) return undefined;
      const cx = randInt(rand, 4, 12);
      const cy = randInt(rand, 7, 15);
      return { ask, xs: base.map(d => cx + d), ys: dy.map(d => cy + ky * d) };
    },
    { ask, xs: [1, 2, 3, 4, 5], ys: [2, 1, 3, 5, 4] },
  );
}

function makeParams(rand: Rand): CorrelationParams {
  const ask = pick(['cov', 'r', 'r-summary'] as const, rand);
  if (ask !== 'r-summary') return makeData(ask, rand);
  return retry(
    100,
    () => {
      const r = pick(R_VALUES, rand) * (rand() < 0.3 ? -1 : 1);
      const sx = randInt(rand, 2, 10);
      const sy = randInt(rand, 2, 10);
      const cov = clean(r * sx * sy);
      return hasDecimals(cov, 2) ? { ask, cov, sx, sy, giveVariance: rand() < 0.5 } : undefined;
    },
    { ask, cov: 12, sx: 4, sy: 5, giveVariance: false },
  );
}

function solve(p: CorrelationParams): number {
  if (p.ask === 'r-summary') return clean(p.cov / (p.sx * p.sy));
  const m = coMoments(p.xs, p.ys);
  return p.ask === 'cov' ? clean(m.sxy / (m.n - 1)) : pearson(m);
}

function renderData(p: DataParams): DrillText {
  const m = coMoments(p.xs, p.ys);
  const mx = mean(p.xs);
  const my = mean(p.ys);
  const r = pearson(m);
  const products = p.xs.map((x, i) => clean((x - mx) * (p.ys[i] - my)));
  const table = texRows([['x', p.xs.map(v => formatNum(v))], ['y', p.ys.map(v => formatNum(v))]]);
  const head = [
    `$\\bar{x} = ${formatNum(mx)}$, $\\bar{y} = ${formatNum(my)}$`,
    `편차곱의 합 $S_{xy} = \\sum (x_i - \\bar{x})(y_i - \\bar{y}) = ${joinSum(products)} = ${formatNum(m.sxy)}$`,
  ];
  if (p.ask === 'cov') {
    const cov = solve(p);
    return {
      prompt: `다음 자료에서 $X$와 $Y$의 표본공분산은?\n$${table}$`,
      solution: [...head, `표본공분산 $= \\dfrac{S_{xy}}{n - 1} = \\dfrac{${formatNum(m.sxy)}}{${m.n - 1}} = ${formatNum(cov)}$`].join('\n'),
      distractors: [tidy(m.sxy / m.n), formatNum(m.sxy), tidy(r), tidy(-cov)],
    };
  }
  const root = Math.sqrt(m.sxx * m.syy);
  return {
    prompt: `다음 자료에서 $X$와 $Y$의 피어슨 상관계수 $r$은?\n$${table}$`,
    solution: [
      ...head,
      `$S_{xx} = ${formatNum(m.sxx)}$, $S_{yy} = ${formatNum(m.syy)}$`,
      `$r = \\dfrac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}} = \\dfrac{${formatNum(m.sxy)}}{\\sqrt{${formatNum(m.sxx)} \\times ${formatNum(m.syy)}}} = \\dfrac{${formatNum(m.sxy)}}{${formatNum(root)}} = ${formatNum(r)}$`,
    ].join('\n'),
    distractors: [tidy(r * r), tidy(-r), tidy((r * (m.n - 1)) / m.n), tidy(m.sxy / m.sxx)],
  };
}

function render(p: CorrelationParams): DrillText {
  if (p.ask !== 'r-summary') return renderData(p);
  const { cov, sx, sy } = p;
  const r = solve(p);
  const given = p.giveVariance
    ? `$V(X) = ${sx * sx}$, $V(Y) = ${sy * sy}$`
    : `$X$의 표준편차 $${sx}$, $Y$의 표준편차 $${sy}$`;
  return {
    prompt: `$\\mathrm{Cov}(X, Y) = ${formatNum(cov)}$, ${given}일 때 $X$와 $Y$의 상관계수는?`,
    solution: [
      ...(p.giveVariance ? [`$\\sigma_X = \\sqrt{${sx * sx}} = ${sx}$, $\\sigma_Y = \\sqrt{${sy * sy}} = ${sy}$`] : []),
      `$r = \\dfrac{\\mathrm{Cov}(X, Y)}{\\sigma_X \\sigma_Y} = \\dfrac{${formatNum(cov)}}{${sx} \\times ${sy}} = ${formatNum(r)}$`,
    ].join('\n'),
    distractors: [
      p.giveVariance ? tidy(cov / (sx * sx * sy * sy)) : tidy(cov / (sx + sy)),
      tidy(r * r),
      tidy(-r),
      tidy(cov / sx),
    ],
  };
}

export const CORRELATION: DrillFamily<CorrelationParams> = {
  kind: 'correlation',
  title: '공분산·상관계수',
  topic: '2.2.1.2',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => (p.ask === 'cov' ? nearby(solve(p), 0.5, rand) : nearby(solve(p), 0.1, rand, -1, 1)),
};
