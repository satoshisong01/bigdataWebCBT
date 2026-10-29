import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { choose, clean, exact, hasDecimals, nearby, tidy, tidyProb } from './shared';
import { power } from './tex';

export type BinomialParams =
  | { ask: 'mean' | 'var' | 'sd'; n: number; p: number }
  | { ask: 'pmf'; n: number; p: number; k: number; context: number }
  | { ask: 'at-least-one'; n: number; p: number; context: number };

const PS: readonly number[] = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9];
const NS: readonly number[] = [10, 20, 25, 30, 40, 50, 60, 80, 100, 200];

/** (n, p) whose variance np(1-p) has ≤ 3 decimals */
const MOMENT_CASES = NS.flatMap(n => PS.map(p => ({ n, p }))).filter(({ n, p }) => hasDecimals(n * p * (1 - p), 3));
/** (n, p) whose standard deviation is a whole or half number */
const SD_CASES = Array.from({ length: 397 }, (_, i) => i + 4)
  .flatMap(n => PS.map(p => ({ n, p })))
  .filter(({ n, p }) => hasDecimals(Math.sqrt(n * p * (1 - p)), 1));
/** (n, p, k) with an exact P(X = k) of ≤ 3 decimals, 1 ≤ k ≤ n - 1 */
const PMF_CASES = [2, 3, 4, 5].flatMap(n =>
  [0.1, 0.2, 0.3, 0.4, 0.5].flatMap(p =>
    Array.from({ length: n - 1 }, (_, i) => ({ n, p, k: i + 1 })),
  ),
).filter(({ n, p, k }) => hasDecimals(choose(n, k) * p ** k * (1 - p) ** (n - k), 3));

interface Context {
  intro: (n: number, p: number) => string;
  exactly: (k: number) => string;
  atLeastOne: string;
}

const CONTEXTS: readonly Context[] = [
  {
    intro: (n, p) => `불량률이 $${formatNum(p * 100)}\\%$인 공정에서 제품 $${n}$개를 임의로 뽑는다.`,
    exactly: k => `불량품이 정확히 $${k}$개일 확률은?`,
    atLeastOne: '불량품이 적어도 $1$개 나올 확률은?',
  },
  {
    intro: (n, p) => `한 번 시도할 때 성공 확률이 $${formatNum(p)}$인 독립 시행을 $${n}$번 반복한다.`,
    exactly: k => `정확히 $${k}$번 성공할 확률은?`,
    atLeastOne: '적어도 $1$번 성공할 확률은?',
  },
];

type MomentParams = Extract<BinomialParams, { ask: 'mean' | 'var' | 'sd' }>;

const isMoment = (b: BinomialParams): b is MomentParams => b.ask === 'mean' || b.ask === 'var' || b.ask === 'sd';

function makeParams(rand: Rand): BinomialParams {
  const ask = pick(['mean', 'var', 'sd', 'pmf', 'at-least-one'] as const, rand);
  if (ask === 'pmf') return { ask, ...pick(PMF_CASES, rand), context: randInt(rand, 0, 1) };
  if (ask === 'at-least-one') {
    return { ask, n: randInt(rand, 2, 3), p: pick([0.1, 0.2, 0.3, 0.4, 0.5], rand), context: randInt(rand, 0, 1) };
  }
  return { ask, ...pick(ask === 'sd' ? SD_CASES : MOMENT_CASES, rand) };
}

function solve(b: BinomialParams): number {
  const q = 1 - b.p;
  switch (b.ask) {
    case 'mean':
      return clean(b.n * b.p);
    case 'var':
      return clean(b.n * b.p * q);
    case 'sd':
      return clean(Math.sqrt(b.n * b.p * q));
    case 'pmf':
      return clean(choose(b.n, b.k) * b.p ** b.k * q ** (b.n - b.k));
    case 'at-least-one':
      return clean(1 - q ** b.n);
  }
}

function renderMoment(b: MomentParams): DrillText {
  const { n, p } = b;
  const q = clean(1 - p);
  const mean = clean(n * p);
  const v = clean(n * p * q);
  const label = { mean: '기댓값 $E(X)$는', var: '분산 $V(X)$는', sd: '표준편차 $\\sigma(X)$는' }[b.ask];
  const varLine = `$V(X) = np(1-p) = ${n} \\times ${formatNum(p)} \\times ${formatNum(q)} = ${formatNum(v)}$`;
  const solution = {
    mean: `$E(X) = np = ${n} \\times ${formatNum(p)} = ${formatNum(mean)}$`,
    var: varLine,
    sd: [varLine, `$\\sigma(X) = \\sqrt{${formatNum(v)}} = ${formatNum(Math.sqrt(v))}$`].join('\n'),
  }[b.ask];
  const distractors = {
    mean: [tidy(v), tidy(n * q), tidy(Math.sqrt(v))],
    var: [tidy(mean), tidy(Math.sqrt(v)), tidy(n * p * p), tidy(p * q)],
    sd: [tidy(v), tidy(mean), tidy(Math.sqrt(mean)), tidy(Math.sqrt(p * q))],
  }[b.ask];
  return { prompt: `$X \\sim B(${n},\\ ${formatNum(p)})$일 때 ${label}?`, solution, distractors };
}

function render(b: BinomialParams): DrillText {
  if (isMoment(b)) return renderMoment(b);
  const { n, p } = b;
  const q = clean(1 - p);
  const ans = formatNum(solve(b));
  const context = CONTEXTS[b.context];
  const intro = context.intro(n, p);
  if (b.ask === 'at-least-one') {
    return {
      prompt: `${intro} ${context.atLeastOne}`,
      solution: [
        `여사건 이용: $P(X \\ge 1) = 1 - P(X = 0) = 1 - (1-p)^{${n}}$`,
        `$= 1 - ${formatNum(q)}^{${n}} = 1 - ${exact(q ** n)} = ${ans}$`,
      ].join('\n'),
      distractors: [tidyProb(q ** n), tidyProb(n * p), tidyProb(1 - p ** n), tidyProb(p ** n)],
    };
  }
  const { k } = b;
  const c = choose(n, k);
  const substituted = `${c} \\times ${power(formatNum(p), k)} \\times ${power(formatNum(q), n - k)}`;
  const evaluated = k > 1 || n - k > 1 ? ` = ${c} \\times ${exact(p ** k)} \\times ${exact(q ** (n - k))}` : '';
  return {
    prompt: `${intro} ${context.exactly(k)}`,
    solution: [
      `$P(X = ${k}) = \\binom{${n}}{${k}} p^{${k}} (1-p)^{${n - k}}$`,
      `$= ${substituted}${evaluated} = ${ans}$`,
    ].join('\n'),
    distractors: [
      tidyProb(p ** k * q ** (n - k)),
      tidyProb(c * p ** (n - k) * q ** k),
      tidyProb(c * p ** k),
      tidyProb(n * p),
    ],
  };
}

export const BINOMIAL: DrillFamily<BinomialParams> = {
  kind: 'binomial',
  title: '이항분포',
  topic: '2.3.1.3',
  makeParams,
  solve,
  render,
  fallback: (b, rand) =>
    b.ask === 'pmf' || b.ask === 'at-least-one' ? nearby(solve(b), 0.05, rand, 0.01, 0.99) : nearby(solve(b), 1, rand, 0.5),
};
