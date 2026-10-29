import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, composition, nearby, sum, tidy } from './shared';
import { paren, signed, texRows } from './tex';

export type ExpectationParams =
  | { ask: 'linear-mean'; a: number; b: number; mean: number }
  | { ask: 'linear-var'; a: number; b: number; variance: number }
  | { ask: 'linear-sd'; a: number; b: number; sd: number }
  /** ps are tenths summing to 1; `hidden` = index of the probability shown as the unknown a */
  | { ask: 'discrete-mean' | 'discrete-var'; xs: number[]; ps: number[]; hidden: number | null };

type Discrete = Extract<ExpectationParams, { ask: 'discrete-mean' | 'discrete-var' }>;

const isDiscrete = (p: ExpectationParams): p is Discrete => p.ask === 'discrete-mean' || p.ask === 'discrete-var';

const ASKS: readonly ExpectationParams['ask'][] = ['linear-mean', 'linear-var', 'linear-sd', 'discrete-mean', 'discrete-var'];
const SLOPES: readonly number[] = [-3, -2, 2, 3, 4, 5];

export function discreteMoments(xs: readonly number[], ps: readonly number[]): { mean: number; second: number; variance: number } {
  const m = clean(sum(xs.map((x, i) => x * ps[i])));
  const second = clean(sum(xs.map((x, i) => x * x * ps[i])));
  return { mean: m, second, variance: clean(second - m * m) };
}

function makeParams(rand: Rand): ExpectationParams {
  const ask = pick(ASKS, rand);
  const a = pick(SLOPES, rand);
  const b = randInt(rand, 1, 10) * (rand() < 0.5 ? -1 : 1);
  switch (ask) {
    case 'linear-mean':
      return { ask, a, b, mean: randInt(rand, -5, 20) };
    case 'linear-var':
      return { ask, a, b, variance: randInt(rand, 1, 25) };
    case 'linear-sd':
      return { ask, a, b, sd: randInt(rand, 1, 10) };
    default: {
      const k = randInt(rand, 3, 4);
      const start = randInt(rand, 0, 3);
      const step = pick([1, 2], rand);
      const xs = Array.from({ length: k }, (_, i) => start + i * step);
      const ps = composition(rand, 10, k).map(t => t / 10);
      return { ask, xs, ps, hidden: rand() < 0.4 ? randInt(rand, 0, k - 1) : null };
    }
  }
}

function solve(p: ExpectationParams): number {
  switch (p.ask) {
    case 'linear-mean':
      return p.a * p.mean + p.b;
    case 'linear-var':
      return p.a * p.a * p.variance;
    case 'linear-sd':
      return Math.abs(p.a) * p.sd;
    case 'discrete-mean':
      return discreteMoments(p.xs, p.ps).mean;
    case 'discrete-var':
      return discreteMoments(p.xs, p.ps).variance;
  }
}

function renderDiscrete(p: Discrete): DrillText {
  const { xs, ps, hidden } = p;
  const { mean, second, variance } = discreteMoments(xs, ps);
  const cells = ps.map((v, i) => (i === hidden ? 'a' : formatNum(v)));
  const table = texRows([['x', xs.map(x => formatNum(x))], ['P(X = x)', cells]]);
  const others = ps.filter((_, i) => i !== hidden).map(v => formatNum(v));
  const hiddenLine = hidden === null
    ? []
    : [`확률의 합은 $1$이므로 $a = 1 - (${others.join(' + ')}) = ${formatNum(ps[hidden])}$`];
  const meanLine = `$E(X) = \\sum x\\,P(x) = ${xs.map((x, i) => `${formatNum(x)} \\times ${formatNum(ps[i])}`).join(' + ')} = ${formatNum(mean)}$`;
  const ask = p.ask === 'discrete-mean' ? '$E(X)$의 값은' : '$V(X)$의 값은';
  const prompt = `확률변수 $X$의 확률분포가 다음과 같을 때 ${ask}?${hidden === null ? '' : ' (단, $a$는 상수)'}\n$${table}$`;
  if (p.ask === 'discrete-mean') {
    const mode = xs[ps.indexOf(Math.max(...ps))];
    return {
      prompt,
      solution: [...hiddenLine, meanLine].join('\n'),
      distractors: [tidy(sum(xs) / xs.length), tidy(second), formatNum(mode)],
    };
  }
  return {
    prompt,
    solution: [
      ...hiddenLine,
      meanLine,
      `$E(X^2) = \\sum x^2 P(x) = ${xs.map((x, i) => `${formatNum(x * x)} \\times ${formatNum(ps[i])}`).join(' + ')} = ${formatNum(second)}$`,
      `$V(X) = E(X^2) - \\{E(X)\\}^2 = ${formatNum(second)} - (${formatNum(mean)})^2 = ${formatNum(variance)}$`,
    ].join('\n'),
    distractors: [tidy(second), tidy(clean(second - mean)), tidy(clean(mean * mean)), tidy(Math.sqrt(variance))],
  };
}

function render(p: ExpectationParams): DrillText {
  if (isDiscrete(p)) return renderDiscrete(p);
  const { a, b } = p;
  const lin = `${formatNum(a)}X ${signed(b)}`;
  const ans = formatNum(solve(p));
  switch (p.ask) {
    case 'linear-mean':
      return {
        prompt: `확률변수 $X$의 기댓값이 $E(X) = ${p.mean}$일 때 $E(${lin})$의 값은?`,
        solution: `$E(aX + b) = aE(X) + b = ${formatNum(a)} \\times ${paren(p.mean)} ${signed(b)} = ${ans}$`,
        distractors: [formatNum(a * p.mean), formatNum(p.mean + b), formatNum(a * (p.mean + b)), formatNum(a * p.mean - b)],
      };
    case 'linear-var':
      return {
        prompt: `확률변수 $X$의 분산이 $V(X) = ${p.variance}$일 때 $V(${lin})$의 값은?`,
        solution: [
          '$V(aX + b) = a^2 V(X)$ (더하는 상수 $b$는 분산에 영향을 주지 않는다)',
          `$= ${paren(a)}^2 \\times ${p.variance} = ${ans}$`,
        ].join('\n'),
        distractors: [formatNum(a * p.variance), formatNum(a * a * p.variance + b), formatNum(a * p.variance + b)],
      };
    case 'linear-sd':
      return {
        prompt: `확률변수 $X$의 표준편차가 $${p.sd}$일 때 $Y = ${lin}$의 표준편차는?`,
        solution: [
          '$\\sigma(aX + b) = |a|\\,\\sigma(X)$ (표준편차는 음수가 될 수 없다)',
          `$= |${formatNum(a)}| \\times ${p.sd} = ${ans}$`,
        ].join('\n'),
        distractors: [formatNum(a * a * p.sd), formatNum(Math.abs(a) * p.sd + b), formatNum(a * p.sd), formatNum(p.sd + b)],
      };
  }
}

export const EXPECTATION: DrillFamily<ExpectationParams> = {
  kind: 'expectation',
  title: '기댓값·분산의 성질',
  topic: '2.3.1.3',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), p.ask.startsWith('discrete') ? 0.1 : 1, rand, p.ask === 'linear-mean' ? -Infinity : 0.1),
};
