/**
 * Test-only helpers for the ML drill families (not a *.test.ts file, so vitest does not collect it).
 */
import { seededRandom, type Rand } from '@/lib/rng';
import type { DrillGenerator, DrillItem } from '../types';

export const SEEDS = 300;

/**
 * Calls `check` for seeds 0..SEEDS-1 with the generated item and the params the generator drew
 * (generate() consumes the seeded stream with makeParams first, so both see the same params).
 */
export function eachSeed<P>(
  gen: DrillGenerator,
  makeParams: (rand: Rand) => P,
  check: (item: DrillItem, params: P, seed: number) => void,
): void {
  for (let seed = 0; seed < SEEDS; seed++) {
    check(gen.generate(seededRandom(seed), `${gen.kind}-${seed}-0`), makeParams(seededRandom(seed)), seed);
  }
}

/** Text of the option marked correct. */
export function answerText(item: DrillItem): string {
  return item.options[item.answer - 1];
}
