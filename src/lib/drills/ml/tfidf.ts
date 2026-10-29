/**
 * 텍스트 마이닝 — TF-IDF 계산·비교, 상용로그 값 제공 (출제기준 3.1.2.6 비정형 데이터 분석).
 * N/DF is always 2^a·5^b, so log10 follows exactly from the given log 2 = 0.3, log 5 = 0.7.
 * Pure pipeline: makeParams(rand) → solve(params) → render.
 */
import { pick, randInt, shuffleWith, type Rand } from '@/lib/rng';
import { formatNum, uniqueOptions } from '../util';
import {
  block, distinctOthers, hasDecimals, im, josa, nearby, pipeline, roundTo, sampleUntil, tex, texTable, withCommas,
  type DrillBody,
} from './_shared';

export type TfidfAsk = 'value' | 'compare';

export interface TfidfTerm {
  word: string;
  /** occurrences in document d */
  tf: number;
  /** documents containing the word */
  df: number;
}

export interface TfidfParams {
  ask: TfidfAsk;
  /** N, number of documents */
  docs: number;
  /** one term ('value') or four ('compare') */
  terms: TfidfTerm[];
  /** words in document d when TF is normalized (count / length); 0 = raw counts */
  docLength: number;
}

export interface TfidfSolution {
  idf: number[];
  scores: number[];
  /** 'value': the TF-IDF score; 'compare': index of the best term */
  value: number;
}

const ASKS: readonly TfidfAsk[] = ['value', 'compare'];
const WORDS = ['데이터', '분석', '모델', '학습', '시각화', '통계', '알고리즘', '클라우드'];
/** N / DF ratios of the form 2^a·5^b */
const RATIOS = [1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 250, 500, 1000];
const LOG_HINT = tex`\text{IDF} = \log_{10}\frac{N}{DF},\ \log 2 = 0.3,\ \log 5 = 0.7`;
const FALLBACKS: Record<TfidfAsk, TfidfParams> = {
  value: { ask: 'value', docs: 1000, terms: [{ word: '모델', tf: 3, df: 100 }], docLength: 0 },
  compare: {
    ask: 'compare',
    docs: 1000,
    terms: [
      { word: '데이터', tf: 8, df: 1000 },
      { word: '분석', tf: 4, df: 100 },
      { word: '모델', tf: 1, df: 1 },
      { word: '학습', tf: 3, df: 500 },
    ],
    docLength: 0,
  },
};

/** Exponent of `base` in r and the remaining factor: (40, 2) → [3, 5]. */
function factorOut(r: number, base: number): [number, number] {
  if (r <= 0 || r % base !== 0) return [0, r];
  const [n, rest] = factorOut(r / base, base);
  return [n + 1, rest];
}

/** Exponents (a, b) with ratio = 2^a·5^b, or null when the ratio has other prime factors. */
function twoFive(ratio: number): [number, number] | null {
  if (!Number.isInteger(ratio) || ratio < 1) return null;
  const [a, afterTwo] = factorOut(ratio, 2);
  const [b, rest] = factorOut(afterTwo, 5);
  return rest === 1 ? [a, b] : null;
}

/** log10 of 2^a·5^b using log 2 = 0.3, log 5 = 0.7 (NaN for other ratios). */
export function approxLog10(ratio: number): number {
  const ab = twoFive(ratio);
  return ab ? roundTo(0.3 * ab[0] + 0.7 * ab[1], 4) : NaN;
}

function termFrequency(p: TfidfParams, t: TfidfTerm): number {
  return p.docLength > 0 ? t.tf / p.docLength : t.tf;
}

export function solve(p: TfidfParams): TfidfSolution {
  const idf = p.terms.map(t => approxLog10(p.docs / t.df));
  const scores = p.terms.map((t, i) => roundTo(termFrequency(p, t) * idf[i], 6));
  const best = scores.indexOf(Math.max(...scores));
  return { idf, scores, value: p.ask === 'value' ? scores[0] : best };
}

/** 'value' only: what the classic mistakes produce, most plausible first. */
function mistakes(p: TfidfParams, s: TfidfSolution): number[] {
  const t = p.terms[0];
  const tf = termFrequency(p, t);
  return [s.idf[0], tf * (p.docs / t.df), tf * Math.log10(p.docs), -s.scores[0], tf + s.idf[0]];
}

function argmax(xs: readonly number[]): number {
  return xs.indexOf(Math.max(...xs));
}

function isGood(p: TfidfParams): boolean {
  const s = solve(p);
  if (s.idf.some(x => !Number.isFinite(x))) return false;
  if (p.ask === 'value') {
    const correct = formatNum(s.value);
    return s.value > 0 && hasDecimals(s.value, 3) && distinctOthers(correct, mistakes(p, s).map(v => formatNum(v))) >= 3;
  }
  const sorted = [...s.scores].sort((a, b) => b - a);
  const clearWinner = sorted[0] - sorted[1] >= 0.1;
  const traps = argmax(p.terms.map(t => t.tf)) !== s.value && argmax(s.idf) !== s.value;
  return clearWinner && traps && new Set(p.terms.map(t => t.df)).size === p.terms.length;
}

function draw(rand: Rand, ask: TfidfAsk): TfidfParams {
  const docs = pick([100, 1000], rand);
  const ratios = RATIOS.filter(r => r <= docs && docs % r === 0);
  const words = shuffleWith(WORDS, rand);
  if (ask === 'value') {
    const normalized = rand() < 0.3;
    const term = { word: words[0], tf: randInt(rand, 1, normalized ? 10 : 6), df: docs / pick(ratios.filter(r => r > 1), rand) };
    return { ask, docs, terms: [term], docLength: normalized ? pick([10, 20, 50, 100], rand) : 0 };
  }
  const terms = words.slice(0, 4).map(word => ({ word, tf: randInt(rand, 1, 8), df: docs / pick(ratios, rand) }));
  return { ask, docs, terms, docLength: 0 };
}

export function makeParams(rand: Rand): TfidfParams {
  const ask = pick(ASKS, rand);
  return sampleUntil(rand, r => draw(r, ask), isGood, FALLBACKS[ask], 3000);
}

/** e.g. log 40 = log(2^3 × 5) = 3 × 0.3 + 1 × 0.7 = 1.6; powers of 10 and the given logs stay short. */
function logTex(ratio: number): string {
  const [a, b] = twoFive(ratio) ?? [0, 0];
  const value = formatNum(approxLog10(ratio));
  const factor = (base: number, e: number): string => (e === 0 ? '' : e === 1 ? String(base) : `${base}^{${e}}`);
  const product = [factor(2, a), factor(5, b)].filter(Boolean).join(tex` \times `);
  if (a === b || product === String(ratio)) return tex`\log ${ratio} = ${value}`;
  const terms = [a > 0 ? tex`${a} \times 0.3` : '', b > 0 ? tex`${b} \times 0.7` : ''].filter(Boolean).join(' + ');
  return tex`\log ${ratio} = \log(${product}) = ${terms} = ${value}`;
}

function tfTex(p: TfidfParams, t: TfidfTerm): string {
  return p.docLength > 0 ? tex`\frac{${t.tf}}{${p.docLength}}` : String(t.tf);
}

function scoreLine(p: TfidfParams, s: TfidfSolution, i: number): string {
  const t = p.terms[i];
  return `${t.word}: ${im(tex`\text{IDF} = \log\frac{${p.docs}}{${t.df}} = ${logTex(p.docs / t.df)}`)} → `
    + im(tex`${tfTex(p, t)} \times ${formatNum(s.idf[i])} = ${formatNum(s.scores[i])}`);
}

function prompt(p: TfidfParams): string {
  const hint = `(단, ${im(LOG_HINT)})`;
  if (p.ask === 'value') {
    const t = p.terms[0];
    const topic = `'${t.word}'${josa(t.word, '은', '는')}`;
    const tf = p.docLength > 0
      ? `문서 d(총 ${p.docLength}단어)에서 ${topic} ${t.tf}번 등장한다(TF = 등장 횟수 ÷ 문서의 단어 수).`
      : `문서 d에서 ${topic} ${t.tf}번 등장한다(TF = 등장 횟수).`;
    return `문서 ${withCommas(p.docs)}개 중 단어 '${t.word}'${josa(t.word, '이', '가')} 등장하는 문서는 ${withCommas(t.df)}개이다. ${tf} `
      + `문서 d에서 '${t.word}'의 TF-IDF는? ${hint}`;
  }
  const table = texTable('c|cc', [
    [tex`\text{단어}`, tex`\text{TF (문서 d)}`, tex`\text{DF}`],
    ...p.terms.map(t => [tex`\text{${t.word}}`, t.tf, t.df]),
  ]);
  return `문서 ${withCommas(p.docs)}개로 이루어진 말뭉치에서 문서 d의 단어별 TF(문서 d 안의 등장 횟수)와 DF(그 단어가 등장한 문서 수)가 `
    + `다음과 같다. 문서 d에서 TF-IDF가 가장 큰 단어는? ${hint}\n${block(table)}`;
}

function explain(p: TfidfParams, s: TfidfSolution): string[] {
  const tip = '※ 모든 문서에 흔한 단어는 IDF가 0에 가까워 TF가 커도 가중치가 작습니다. IDF의 분수를 DF/N으로 뒤집으면 음수가 됩니다.';
  if (p.ask === 'value') {
    const t = p.terms[0];
    return [
      im(tex`\text{IDF} = \log\frac{N}{DF} = \log\frac{${p.docs}}{${t.df}} = ${logTex(p.docs / t.df)}`),
      im(tex`\text{TF-IDF} = \text{TF} \times \text{IDF} = ${tfTex(p, t)} \times ${formatNum(s.idf[0])} = ${formatNum(s.value)}`),
      tip,
    ];
  }
  const best = p.terms[s.value];
  return [
    ...p.terms.map((_, i) => scoreLine(p, s, i)),
    `가장 큰 값: '${best.word}' (${formatNum(s.scores[s.value])})`,
    tip,
  ];
}

function render(p: TfidfParams, s: TfidfSolution, rand: Rand): DrillBody {
  if (p.ask === 'compare') {
    const words = p.terms.map(t => t.word);
    const { options, answer } = uniqueOptions(words[s.value], words.filter((_, i) => i !== s.value), rand, () => '');
    return { title: 'TF-IDF · 가장 중요한 단어', prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
  }
  const format = (x: number): string => formatNum(x);
  const candidates = [...mistakes(p, s).map(format), ...nearby(s.value, 0.3, format, x => x > 0)];
  const { options, answer } = uniqueOptions(format(s.value), candidates, rand, () => '');
  return { title: 'TF-IDF · 값 계산', prompt: prompt(p), options, answer, solution: explain(p, s).join('\n') };
}

export const tfidfGenerator = pipeline(
  { kind: 'tfidf', title: 'TF-IDF', topic: '3.1.2.6' },
  makeParams,
  solve,
  render,
);
