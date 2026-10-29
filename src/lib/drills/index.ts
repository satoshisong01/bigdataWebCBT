/**
 * CONTRACT — drill registry. Families live in ./stats and ./ml (one family per file).
 */
import { hashSeed, seededRandom, shuffleWith } from '@/lib/rng';
import type { DrillGenerator, DrillItem } from './types';
import { STATS_GENERATORS } from './stats';
import { ML_GENERATORS } from './ml';

export type { DrillGenerator, DrillItem } from './types';

export const DRILL_GENERATORS: readonly DrillGenerator[] = [...STATS_GENERATORS, ...ML_GENERATORS];

/**
 * Deterministic for (kinds, seed, count): cycles through the selected generators
 * ('all' = every generator) in a seeded-shuffled order, ids `${kind}-${seed}-${i}`.
 * Unknown kinds are ignored; returns [] when nothing matches.
 */
export function buildDrillSet(kinds: readonly string[] | 'all', seed: number, count: number): DrillItem[] {
  const selected = kinds === 'all' ? DRILL_GENERATORS : DRILL_GENERATORS.filter(g => kinds.includes(g.kind));
  if (selected.length === 0) return [];
  const order = shuffleWith(selected, seededRandom(seed));
  // each item gets its own stream, so item i depends only on (selection, seed, i)
  return Array.from({ length: count }, (_, i) => {
    const gen = order[i % order.length];
    return gen.generate(seededRandom(hashSeed(`${seed}:${i}`)), `${gen.kind}-${seed}-${i}`);
  });
}
