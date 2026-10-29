/**
 * Helpers shared by the ML drill families: the makeParams → solve → render pipeline,
 * number checks, option padding and LaTeX snippets. Generic helpers live in ../util.
 */
import type { Rand } from '@/lib/rng';
import type { DrillGenerator, DrillItem } from '../types';
import { formatNum } from '../util';

/** Tag for LaTeX sources — backslashes stay verbatim: tex`\frac{${a}}{${b}}`. */
export const tex = String.raw;

/** LaTeX row break inside an array. */
const ROW_BREAK = tex` \\ `;

/** Inline KaTeX segment for MathText. */
export function im(src: string): string {
  return '$' + src + '$';
}

/** Display (block) KaTeX segment for MathText. */
export function block(src: string): string {
  return '$$' + src + '$$';
}

export function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** True when x is finite and has at most `digits` decimals (float tolerant). */
export function hasDecimals(x: number, digits: number): boolean {
  if (!Number.isFinite(x)) return false;
  const scaled = x * 10 ** digits;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** Rounds to `digits` decimals (formatNum rounding) — strips float noise like 29.999999999999996. */
export function roundTo(x: number, digits: number): number {
  return Number(formatNum(x, digits));
}

/** Reduced fraction a/b as LaTeX (`\frac{1}{4}`), or a plain integer when b divides a. */
export function texFrac(a: number, b: number): string {
  const g = gcd(a, b) || 1;
  const num = a / g;
  const den = b / g;
  return den === 1 ? String(num) : tex`\frac{${num}}{${den}}`;
}

/**
 * Fixed number of decimals (formatNum rounding, zero padded): fixedNum(0.8, 2) → '0.80'.
 * Used when every option shares one precision so the exact answer does not stand out.
 */
export function fixedNum(x: number, digits: number): string {
  const text = formatNum(x, digits);
  if (digits === 0 || !Number.isFinite(x)) return text;
  const [int, frac = ''] = text.split('.');
  return `${int}.${frac.padEnd(digits, '0')}`;
}

/**
 * Korean particle chosen by the last syllable's final consonant (받침):
 * josa('모델', '이', '가') → '이', josa('데이터', '이', '가') → '가'.
 */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return hangul && (code - 0xac00) % 28 !== 0 ? withFinal : withoutFinal;
}

/** Integer with thousands separators for plain text, e.g. 7850 → '7,850'. */
export function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Number of distinct usable texts other than `correct` — distractor quality check. */
export function distinctOthers(correct: string, texts: readonly string[]): number {
  return new Set(texts.filter(t => t !== correct && t.trim() !== '' && !/NaN|Infinity/.test(t))).size;
}

/**
 * Mistake values formatted with the tidy ones (≤ `digits` decimals) first. Distractors should look
 * as clean as the answer — otherwise the only tidy option gives the answer away.
 */
export function tidyFirst(
  values: readonly number[],
  digits: number,
  format: (x: number) => string = x => formatNum(x),
): string[] {
  const tidy = values.filter(v => hasDecimals(v, digits));
  const rest = values.filter(v => !hasDecimals(v, digits));
  return [...tidy, ...rest].map(format);
}

/** Distinct tidy (≤ `digits` decimals) mistake texts other than `correct`. */
export function tidyCount(
  correct: string,
  values: readonly number[],
  digits: number,
  format: (x: number) => string = x => formatNum(x),
): number {
  return distinctOthers(correct, values.filter(v => hasDecimals(v, digits)).map(format));
}

/**
 * value ± step, ± 2·step … ± 4·step that pass `valid`, formatted. Appended after the
 * mistake-model candidates so uniqueOptions always has enough distinct padding.
 */
export function nearby(
  value: number,
  step: number,
  format: (x: number) => string,
  valid: (x: number) => boolean = () => true,
): string[] {
  return [1, -1, 2, -2, 3, -3, 4, -4].map(k => value + k * step).filter(valid).map(format);
}

/**
 * Calls `draw` until `accept` holds (at most `tries` times), else returns `fallback`.
 * Deterministic for a seeded `rand`; `fallback` must itself be acceptable.
 */
export function sampleUntil<T>(
  rand: Rand,
  draw: (rand: Rand) => T,
  accept: (value: T) => boolean,
  fallback: T,
  tries = 500,
): T {
  for (let i = 0; i < tries; i++) {
    const value = draw(rand);
    if (accept(value)) return value;
  }
  return fallback;
}

/** LaTeX array with a rule under the first (header) row. */
export function texTable(colSpec: string, rows: readonly (readonly (string | number)[])[]): string {
  const [head, ...body] = rows.map(row => row.join(' & '));
  return tex`\begin{array}{${colSpec}} ${head} \\ \hline ${body.join(ROW_BREAK)} \end{array}`;
}

/** Signed term for sums: 2 → '+ 2', -1.5 → '- 1.5'. */
export function signed(x: number, digits = 3): string {
  return x < 0 ? `- ${formatNum(-x, digits)}` : `+ ${formatNum(x, digits)}`;
}

/** Wraps negatives in parentheses for products: -1 → '(-1)'. */
export function paren(x: number, digits = 3): string {
  return x < 0 ? `(${formatNum(x, digits)})` : formatNum(x, digits);
}

export type DrillBody = Omit<DrillItem, 'id' | 'kind' | 'topic'>;

/** Wires a pure family (makeParams → solve → render) into a DrillGenerator. */
export function pipeline<P, S>(
  meta: Pick<DrillGenerator, 'kind' | 'title' | 'topic'>,
  makeParams: (rand: Rand) => P,
  solve: (params: P) => S,
  render: (params: P, solution: S, rand: Rand) => DrillBody,
): DrillGenerator {
  return {
    ...meta,
    generate: (rand, id) => {
      const params = makeParams(rand);
      return { id, kind: meta.kind, topic: meta.topic, ...render(params, solve(params), rand) };
    },
  };
}
