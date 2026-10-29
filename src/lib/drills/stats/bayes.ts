import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';
import type { DrillFamily, DrillText } from './family';
import { clean, nearby, retry, tidyProb } from './shared';

export type BayesParams =
  | { ask: 'conditional'; pA: number; pB: number; pAB: number }
  /** prior = P(D), sens = P(+|D), fpr = P(+|D^c); `context` picks the story */
  | { ask: 'total' | 'posterior'; prior: number; sens: number; fpr: number; context: number };

interface Story {
  setup: (prior: string, sens: string, fpr: string) => string;
  total: string;
  posterior: string;
  legend: string;
}

const STORIES: readonly Story[] = [
  {
    setup: (d, s, f) => `어떤 질병의 유병률은 $${d}\\%$이다. 이 검사는 환자의 $${s}\\%$를 양성으로 판정하고, 건강한 사람의 $${f}\\%$도 양성으로 잘못 판정한다.`,
    total: '임의의 한 사람이 양성 판정을 받을 확률은?',
    posterior: '양성 판정을 받은 사람이 실제로 환자일 확률은?',
    legend: '$D$: 환자, $+$: 양성 판정',
  },
  {
    setup: (d, s, f) => `전체 메일 중 스팸은 $${d}\\%$이다. 필터는 스팸의 $${s}\\%$를 차단하고, 정상 메일의 $${f}\\%$도 잘못 차단한다.`,
    total: '임의의 메일 한 통이 차단될 확률은?',
    posterior: '차단된 메일이 실제로 스팸일 확률은?',
    legend: '$D$: 스팸, $+$: 차단',
  },
  {
    setup: (d, s, f) => `제품의 불량률은 $${d}\\%$이다. 검사기는 불량품의 $${s}\\%$를 불량으로 판정하고, 정상품의 $${f}\\%$도 불량으로 잘못 판정한다.`,
    total: '임의의 제품 하나가 불량 판정을 받을 확률은?',
    posterior: '불량 판정을 받은 제품이 실제로 불량품일 확률은?',
    legend: '$D$: 불량품, $+$: 불량 판정',
  },
];

/** [prior, sens, fpr] in percent; P(+) has ≤ 3 decimals. */
const SCREENINGS: readonly (readonly [number, number, number])[] = [5, 10, 20, 25, 30, 40, 50].flatMap(d =>
  [60, 70, 75, 80, 90, 95].flatMap(s =>
    [5, 10, 15, 20, 25, 30, 40].map(f => [d, s, f] as const),
  ),
).filter(([d, s, f]) => (d * s + (100 - d) * f) % 10 === 0);

/** …and the posterior has ≤ 3 decimals as well. */
const TIDY_POSTERIOR = SCREENINGS.filter(([d, s, f]) => (d * s * 1000) % (d * s + (100 - d) * f) === 0);

const P_B: readonly number[] = [0.2, 0.25, 0.4, 0.5, 0.6, 0.8];
const P_A: readonly number[] = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7];

function makeParams(rand: Rand): BayesParams {
  const r = rand();
  if (r < 0.3) {
    return retry(
      100,
      () => {
        const pB = pick(P_B, rand);
        const cond = randInt(rand, 1, 9) / 10;
        const pAB = clean(pB * cond);
        const pA = pick(P_A, rand);
        // valid joint probabilities and not independent (P(A) ≠ P(A|B))
        const valid = pA >= pAB && pA + pB - pAB <= 1 && Math.abs(pA - cond) > 1e-9;
        return valid ? { ask: 'conditional' as const, pA, pB, pAB } : undefined;
      },
      { ask: 'conditional', pA: 0.3, pB: 0.4, pAB: 0.2 },
    );
  }
  const ask = r < 0.6 ? 'total' : 'posterior';
  const [d, s, f] = pick(ask === 'total' ? SCREENINGS : TIDY_POSTERIOR, rand);
  return { ask, prior: d / 100, sens: s / 100, fpr: f / 100, context: randInt(rand, 0, STORIES.length - 1) };
}

function positiveRate(prior: number, sens: number, fpr: number): number {
  return clean(prior * sens + (1 - prior) * fpr);
}

function solve(p: BayesParams): number {
  if (p.ask === 'conditional') return clean(p.pAB / p.pB);
  const total = positiveRate(p.prior, p.sens, p.fpr);
  return p.ask === 'total' ? total : clean((p.prior * p.sens) / total);
}

function render(p: BayesParams): DrillText {
  if (p.ask === 'conditional') {
    const ans = solve(p);
    return {
      prompt: `두 사건 $A$, $B$에 대해 $P(A) = ${formatNum(p.pA)}$, $P(B) = ${formatNum(p.pB)}$, $P(A \\cap B) = ${formatNum(p.pAB)}$일 때 $P(A \\mid B)$는?`,
      solution: [
        `$P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)} = \\dfrac{${formatNum(p.pAB)}}{${formatNum(p.pB)}} = ${formatNum(ans)}$`,
        '($P(B \\mid A)$는 $P(A)$로 나눈다 — 조건이 되는 사건의 확률로 나눈다)',
      ].join('\n'),
      distractors: [tidyProb(p.pAB / p.pA), tidyProb(p.pA * p.pB), tidyProb(p.pAB), tidyProb(1 - ans)],
    };
  }
  const { prior, sens, fpr } = p;
  const story = STORIES[p.context];
  const pct = (x: number): string => formatNum(x * 100);
  const total = positiveRate(prior, sens, fpr);
  const joint = clean(prior * sens);
  const falsePos = clean((1 - prior) * fpr);
  const totalLines = [
    `(${story.legend})`,
    `전확률: $P(+) = P(+ \\mid D)P(D) + P(+ \\mid D^c)P(D^c)$`,
    `$= ${formatNum(sens)} \\times ${formatNum(prior)} + ${formatNum(fpr)} \\times ${formatNum(clean(1 - prior))} = ${formatNum(joint)} + ${formatNum(falsePos)} = ${formatNum(total)}$`,
  ];
  const head = story.setup(pct(prior), pct(sens), pct(fpr));
  if (p.ask === 'total') {
    return {
      prompt: `${head}\n${story.total}`,
      solution: totalLines.join('\n'),
      distractors: [tidyProb(joint), tidyProb(prior * sens + prior * fpr), tidyProb((sens + fpr) / 2), tidyProb(joint + fpr)],
    };
  }
  const ans = solve(p);
  return {
    prompt: `${head}\n${story.posterior}`,
    solution: [
      ...totalLines,
      `베이즈 정리: $P(D \\mid +) = \\dfrac{P(+ \\mid D)P(D)}{P(+)} = \\dfrac{${formatNum(joint)}}{${formatNum(total)}} = ${formatNum(ans)}$`,
      '(검사 정확도 $P(+ \\mid D)$와 사후확률 $P(D \\mid +)$는 다르다 — 기저율을 반영해야 한다)',
    ].join('\n'),
    distractors: [tidyProb(sens), tidyProb(joint), tidyProb(total), tidyProb(prior), tidyProb(1 - ans)],
  };
}

export const BAYES: DrillFamily<BayesParams> = {
  kind: 'bayes',
  title: '조건부확률·베이즈 정리',
  topic: '2.3.1.3',
  makeParams,
  solve,
  render,
  fallback: (p, rand) => nearby(solve(p), 0.05, rand, 0.01, 0.99),
};
