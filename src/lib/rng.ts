/** Deterministic randomness so a mock exam / drill set can be reproduced from its seed. */

export type Rand = () => number;

/** mulberry32 — small, fast, good enough for shuffling. Returns floats in [0, 1). */
export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string → uint32 seed. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function shuffleWith<T>(items: readonly T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Integer in [min, max] inclusive. */
export function randInt(rand: Rand, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

export function pick<T>(items: readonly T[], rand: Rand): T {
  return items[Math.floor(rand() * items.length)];
}
