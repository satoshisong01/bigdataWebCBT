/** Small numeric helpers shared by the statistics drill families. */
import { randInt, type Rand } from '@/lib/rng';
import { formatNum } from '../util';

export function sum(xs: readonly number[]): number {
  return xs.reduce((acc, x) => acc + x, 0);
}

export function mean(xs: readonly number[]): number {
  return sum(xs) / xs.length;
}

export function sortAsc(xs: readonly number[]): number[] {
  return [...xs].sort((a, b) => a - b);
}

/** Rounds away float noise (6 decimals) so params stay exact, e.g. 0.6 * 0.7 → 0.42. */
export function clean(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/** True when x has at most `decimals` decimal places, ignoring float noise. */
export function hasDecimals(x: number, decimals: number): boolean {
  if (!Number.isFinite(x)) return false;
  const scaled = x * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** formatNum(x) when x has ≤ `decimals` decimals, else '' (skipped) — keeps distractors as tidy as the answer. */
export function tidy(x: number, decimals = 3): string {
  return hasDecimals(x, decimals) ? formatNum(x) : '';
}

/** tidy() for probabilities: '' unless 0 ≤ x ≤ 1. */
export function tidyProb(x: number): string {
  return x >= 0 && x <= 1 ? tidy(x) : '';
}

/** Exact-looking intermediate value for solutions (up to 6 decimals). */
export function exact(x: number): string {
  return formatNum(x, 6);
}

/** Rejection sampling: the first attempt that is not undefined, or `fallback` after `tries` attempts. */
export function retry<T>(tries: number, attempt: () => T | undefined, fallback: T): T {
  for (let i = 0; i < tries; i++) {
    const value = attempt();
    if (value !== undefined) return value;
  }
  return fallback;
}

/** n integers in [-maxAbs, maxAbs] that sum to 0 and are not all 0. */
export function zeroSumDeviations(rand: Rand, n: number, maxAbs: number): number[] {
  const fallback = Array.from({ length: n }, (_, i) => (i === 0 ? -1 : i === 1 ? 1 : 0));
  return retry(
    200,
    () => {
      const head = Array.from({ length: n - 1 }, () => randInt(rand, -maxAbs, maxAbs));
      const all = [...head, -sum(head)];
      return Math.abs(all[n - 1]) <= maxAbs && all.some(d => d !== 0) ? all : undefined;
    },
    fallback,
  );
}

/** Random split of `total` into `parts` positive integers (e.g. tenths of a probability). */
export function composition(rand: Rand, total: number, parts: number): number[] {
  const cuts = new Set<number>();
  while (cuts.size < parts - 1) cuts.add(randInt(rand, 1, total - 1));
  const sorted = [0, ...[...cuts].sort((a, b) => a - b), total];
  return sorted.slice(1).map((c, i) => c - sorted[i]);
}

/** A nearby wrong value (value ± k·step, k = 1..6), or '' when it leaves [min, max]. */
export function nearby(value: number, step: number, rand: Rand, min = -Infinity, max = Infinity): string {
  const k = randInt(rand, 1, 6) * (rand() < 0.5 ? -1 : 1);
  const x = clean(value + k * step);
  return x >= min && x <= max ? formatNum(x) : '';
}

/** C(n, k) for small n. */
export function choose(n: number, k: number): number {
  return Array.from({ length: k }, (_, i) => i).reduce((acc, i) => (acc * (n - i)) / (i + 1), 1);
}
