/**
 * 베이지안 기법 — 베이즈 정리·나이브 베이즈 사후확률 (출제기준 3.1.2.4 베이지안 기법).
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, hasDecimals, im, josa, nearby, pipeline, roundTo, sampleUntil, tex, texTable, tidyCount, tidyFirst,
  type DrillBody,
} from './_shared';

export type NaiveBayesAsk = 'bayes' | 'nb';

export interface NaiveBayesParams {
  ask: NaiveBayesAsk;
  /** index into the story list of the ask (labels only) */
  story: number;
  /** P(A), the prior of the first class */
  prior: number;
  /** P(x_j | A), P(x_j | B) per observed feature: 1 for 'bayes', 2 for 'nb' */
  likeA: number[];
  likeB: number[];
}

export interface NaiveBayesSolution {
  /** P(A)·Π P(x_j | A) */
  scoreA: number;
  /** P(B)·Π P(x_j | B) */
  scoreB: number;
  /** P(A | x) */
  value: number;
}

interface BayesStory {
  text: (prior: string, likeA: string, likeB: string) => string;
  classes: readonly [string, string];
  evidence: string;
}

interface NbStory {
  classes: readonly [string, string];
  features: readonly [string, string];
  subject: string;
}

const BAYES_STORIES: readonly BayesStory[] = [
  {
    text: (pr, a, b) => `어떤 질병의 유병률은 ${pr}이다. 이 검사는 환자의 ${a}, 비환자의 ${b}를 양성으로 판정한다. `
      + '검사 결과가 양성일 때 실제로 질병이 있을 확률은?',
    classes: ['질병', '정상'],
    evidence: '양성',
  },
  {
    text: (pr, a, b) => `전체 메일의 ${pr}가 스팸이다. 단어 '무료'는 스팸 메일의 ${a}, 정상 메일의 ${b}에 등장한다. `
      + "'무료'가 포함된 메일이 스팸일 확률은?",
    classes: ['스팸', '정상'],
    evidence: '무료',
  },
  {
    text: (pr, a, b) => `생산품의 ${pr}가 불량품이다. 검사 센서는 불량품의 ${a}, 정상품의 ${b}에서 경보를 울린다. `
      + '경보가 울린 제품이 실제로 불량일 확률은?',
    classes: ['불량', '정상'],
    evidence: '경보',
  },
];

const NB_STORIES: readonly NbStory[] = [
  { classes: ['스팸', '정상'], features: ['무료', '당첨'], subject: "단어 '무료'와 '당첨'이 모두 포함된 메일" },
  { classes: ['구매', '비구매'], features: ['20대', '쿠폰'], subject: '20대이면서 쿠폰을 받은 고객' },
  { classes: ['이탈', '유지'], features: ['약정만료', '불만접수'], subject: '약정이 만료되고 불만을 접수한 고객' },
];

const ASKS: readonly NaiveBayesAsk[] = ['bayes', 'nb'];
const FALLBACKS: Record<NaiveBayesAsk, NaiveBayesParams> = {
  bayes: { ask: 'bayes', story: 0, prior: 0.1, likeA: [0.9], likeB: [0.1] },
  // 0.4·0.6·0.6 = 0.144, 0.6·0.2·0.3 = 0.036 → 0.144 / 0.18 = 0.8
  nb: { ask: 'nb', story: 0, prior: 0.4, likeA: [0.6, 0.6], likeB: [0.2, 0.3] },
};

function product(xs: readonly number[]): number {
  return xs.reduce((a, b) => a * b, 1);
}

export function solve(p: NaiveBayesParams): NaiveBayesSolution {
  const scoreA = roundTo(p.prior * product(p.likeA), 6);
  const scoreB = roundTo((1 - p.prior) * product(p.likeB), 6);
  return { scoreA, scoreB, value: scoreA / (scoreA + scoreB) };
}

/** Values the classic mistakes produce, most plausible first. */
function mistakes(p: NaiveBayesParams, s: NaiveBayesSolution): number[] {
  if (p.ask === 'bayes') return [p.likeA[0], s.scoreA, s.scoreA + s.scoreB, 1 - s.value, p.prior];
  const la = roundTo(product(p.likeA), 6);
  const lb = roundTo(product(p.likeB), 6);
  return [s.scoreA, la / (la + lb), 1 - s.value, la];
}

function isGood(p: NaiveBayesParams): boolean {
  const s = solve(p);
  const realistic = p.likeA.every((a, i) => a > p.likeB[i]);
  const tidy = tidyCount(formatNum(s.value), mistakes(p, s), 3);
  return realistic && hasDecimals(s.value, 3) && s.value > 0.05 && s.value < 0.95 && tidy >= 3;
}

function tenths(rand: Rand, min: number, max: number): number {
  return randInt(rand, min, max) / 10;
}

function draw(rand: Rand, ask: NaiveBayesAsk): NaiveBayesParams {
  const features = ask === 'bayes' ? 1 : 2;
  return {
    ask,
    story: randInt(rand, 0, (ask === 'bayes' ? BAYES_STORIES : NB_STORIES).length - 1),
    prior: tenths(rand, 1, ask === 'bayes' ? 5 : 6),
    likeA: Array.from({ length: features }, () => tenths(rand, 2, 9)),
    likeB: Array.from({ length: features }, () => tenths(rand, 1, 6)),
  };
}

export function makeParams(rand: Rand): NaiveBayesParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 3000);
}

const pct = (x: number): string => `${formatNum(100 * x, 1)}%`;

function prompt(p: NaiveBayesParams): string {
  if (p.ask === 'bayes') return BAYES_STORIES[p.story].text(pct(p.prior), pct(p.likeA[0]), pct(p.likeB[0]));
  const { classes: [a, b], features: [f1, f2], subject } = NB_STORIES[p.story];
  const row = (label: string, x: number, y: number): (string | number)[] => [label, formatNum(x), formatNum(y)];
  const table = texTable('c|cc', [
    ['', tex`\text{${a}}`, tex`\text{${b}}`],
    row(tex`P(\text{클래스})`, p.prior, 1 - p.prior),
    row(tex`P(\text{${f1}} \mid \text{클래스})`, p.likeA[0], p.likeB[0]),
    row(tex`P(\text{${f2}} \mid \text{클래스})`, p.likeA[1], p.likeB[1]),
  ]);
  return `나이브 베이즈 분류기의 학습 결과가 다음과 같다. ${subject}${josa(subject, '이', '가')} '${a}'일 사후확률은?\n${block(table)}`;
}

function explain(p: NaiveBayesParams, s: NaiveBayesSolution): string[] {
  const v = formatNum(s.value);
  const [sa, sb] = [formatNum(s.scoreA, 4), formatNum(s.scoreB, 4)];
  if (p.ask === 'bayes') {
    const { classes: [a, b], evidence: e } = BAYES_STORIES[p.story];
    const [A, B, E] = [tex`\text{${a}}`, tex`\text{${b}}`, tex`\text{${e}}`];
    return [
      `${im(tex`P(${E}) = P(${E} \mid ${A})P(${A}) + P(${E} \mid ${B})P(${B})`)} ${im(tex`= ${formatNum(p.likeA[0])} \times ${formatNum(p.prior)} + ${formatNum(p.likeB[0])} \times ${formatNum(1 - p.prior)} = ${sa} + ${sb}`)}`,
      im(tex`P(${A} \mid ${E}) = \frac{P(${E} \mid ${A})P(${A})}{P(${E})} = \frac{${sa}}{${sa} + ${sb}} = ${v}`),
      `※ 검사의 정확도 ${im(tex`P(${E} \mid ${A})`)}를 답으로 고르는 기저율(사전확률) 무시 오류에 주의하세요.`,
    ];
  }
  const { classes: [a, b], features: [f1, f2] } = NB_STORIES[p.story];
  const score = (cls: string, prior: number, likes: readonly number[], value: string): string =>
    im(tex`P(\text{${cls}})P(\text{${f1}} \mid \text{${cls}})P(\text{${f2}} \mid \text{${cls}}) = ${likes.reduce((acc, l) => tex`${acc} \times ${formatNum(l)}`, formatNum(prior))} = ${value}`);
  return [
    `'${a}' 점수: ${score(a, p.prior, p.likeA, sa)}`,
    `'${b}' 점수: ${score(b, 1 - p.prior, p.likeB, sb)}`,
    im(tex`P(\text{${a}} \mid \text{${f1}}, \text{${f2}}) = \frac{${sa}}{${sa} + ${sb}} = ${v}`),
    '※ 나이브 베이즈는 클래스가 주어지면 특성끼리 조건부 독립이라고 가정해 확률을 곱합니다. 사전확률을 빠뜨리거나 두 점수의 합으로 나누는 정규화를 생략하지 마세요.',
  ];
}

const TITLE: Record<NaiveBayesAsk, string> = { bayes: '베이즈 정리 · 사후확률', nb: '나이브 베이즈 · 사후확률' };

function render(p: NaiveBayesParams, s: NaiveBayesSolution, rand: Rand): DrillBody {
  const format = (x: number): string => formatNum(x);
  const candidates = [...tidyFirst(mistakes(p, s), 3), ...nearby(s.value, 0.05, format, x => x > 0 && x < 1)];
  const { options, answer } = uniqueOptions(format(s.value), candidates, rand, () => '');
  return { title: TITLE[p.ask], prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const naiveBayesGenerator = pipeline(
  { kind: 'naive-bayes', title: '나이브 베이즈', topic: '3.1.2.4' },
  makeParams,
  solve,
  render,
);
