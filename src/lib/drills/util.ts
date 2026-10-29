/**
 * Shared helpers for drill generators (stats + ml families). Stable API — other families import it.
 */
import { shuffleWith, type Rand } from '@/lib/rng';

const OPTION_COUNT = 4;
const MAX_FALLBACK_TRIES = 200;
const INVALID_TEXT = /NaN|Infinity|undefined/;

/**
 * Number → display text: rounded to `digits` decimals (default 3, half away from zero),
 * trailing zeros stripped, never '-0', no thousands separators (safe inside $...$).
 * e.g. 2.5 → '2.5', 4 → '4', 1/3 → '0.333', 0.1 + 0.2 → '0.3', -0.0001 → '0'.
 * Non-finite input yields 'NaN' / 'Infinity' / '-Infinity' so tests can catch it.
 */
export function formatNum(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return String(x);
  const factor = 10 ** digits;
  const rounded = (Math.sign(x) * Math.round(Math.abs(x) * factor)) / factor;
  const fixed = rounded.toFixed(digits);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}

export interface OptionSet {
  /** exactly 4 distinct strings, seeded-shuffled */
  options: string[];
  /** 1-based position of `correct` in `options` */
  answer: number;
}

function isUsable(text: string): boolean {
  return text.trim() !== '' && !INVALID_TEXT.test(text);
}

/**
 * Builds 4 distinct options from the correct text plus distractors.
 * - `candidates` are taken in priority order (most plausible mistakes first); duplicates of
 *   `correct` / each other and empty or NaN/Infinity/undefined texts are skipped.
 * - When fewer than 3 distractors remain, `fallback()` is called (up to 200 times) for more.
 * - The 4 options are shuffled with `rand`; `answer` points at `correct`.
 * Throws if 4 distinct options cannot be produced (a generator bug, caught by the drill tests).
 */
export function uniqueOptions(
  correct: string,
  candidates: string[],
  rand: Rand,
  fallback: () => string,
): OptionSet {
  const picked = candidates.reduce<string[]>(
    (acc, c) => (acc.length < OPTION_COUNT && isUsable(c) && !acc.includes(c) ? [...acc, c] : acc),
    [correct],
  );
  let all = picked;
  for (let tries = 0; all.length < OPTION_COUNT && tries < MAX_FALLBACK_TRIES; tries++) {
    const extra = fallback();
    if (isUsable(extra) && !all.includes(extra)) all = [...all, extra];
  }
  if (all.length < OPTION_COUNT) {
    throw new Error(`uniqueOptions: could not build ${OPTION_COUNT} distinct options for "${correct}"`);
  }
  const options = shuffleWith(all, rand);
  return { options, answer: options.indexOf(correct) + 1 };
}
