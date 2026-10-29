/** Pure helpers for the /drill page. */
import type { DrillItem } from '@/lib/drills';

export type DrillCount = 10 | 20;
export const DRILL_COUNTS: readonly DrillCount[] = [10, 20];

/** `?seed=` → uint32, or null when absent or not a plain decimal uint32. */
export function parseSeed(raw: string | null): number | null {
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= 0xffffffff ? n : null;
}

/** 'all' when every generator is selected, otherwise the selected kinds in registry order. */
export function resolveKinds(selected: ReadonlySet<string>, all: readonly string[]): readonly string[] | 'all' {
  if (all.length > 0 && all.every(k => selected.has(k))) return 'all';
  return all.filter(k => selected.has(k));
}

export interface KindScore {
  kind: string;
  title: string;
  correct: number;
  total: number;
}

/** Answered items tallied per kind, in first-appearance order; `titles` overrides the item title. */
export function kindBreakdown(
  items: readonly DrillItem[],
  picks: readonly number[],
  titles?: ReadonlyMap<string, string>,
): KindScore[] {
  const byKind = new Map<string, KindScore>();
  picks.forEach((pick, i) => {
    const item = items[i];
    if (!item) return;
    const prev = byKind.get(item.kind) ?? { kind: item.kind, title: titles?.get(item.kind) ?? item.title, correct: 0, total: 0 };
    byKind.set(item.kind, { ...prev, correct: prev.correct + (pick === item.answer ? 1 : 0), total: prev.total + 1 });
  });
  return Array.from(byKind.values());
}
