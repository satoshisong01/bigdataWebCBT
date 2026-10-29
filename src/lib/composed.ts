/**
 * Pinned question lists of composed /exam sets (모의고사 · 약점 집중 · 토픽), keyed by exam key
 * ('mock-<seed>', 'pool-weak-<seed>', 'pool-topic-<id>'), so a reload or a later visit of the same URL
 * shows the same questions even after the stats it was composed from changed.
 *
 * Key: bigdata-cbt-composed — ComposedEntry[] most recent first, at most MAX_COMPOSED keys.
 * Reads survive missing/corrupt JSON, writes are wrapped in try/catch, everything is a no-op on the server.
 */

const COMPOSED_KEY = 'bigdata-cbt-composed';
/** Sets composed or reused longest ago are dropped beyond this many keys. */
export const MAX_COMPOSED = 30;

interface ComposedEntry {
  key: string;
  /** question ids in exam order */
  ids: string[];
}

function isIdList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((id: unknown) => typeof id === 'string' && id !== '');
}

function toEntry(v: unknown): ComposedEntry | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined;
  const { key, ids } = v as Record<string, unknown>;
  if (typeof key !== 'string' || key === '' || !isIdList(ids)) return undefined;
  return { key, ids: Array.from(new Set(ids)) };
}

/** Valid entries, most recent first, one per key; [] when missing, corrupt, unreadable or on the server. */
function readEntries(): ComposedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPOSED_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.flatMap((v: unknown): ComposedEntry[] => {
      const entry = toEntry(v);
      if (!entry || seen.has(entry.key)) return [];
      seen.add(entry.key);
      return [entry];
    });
  } catch {
    return [];
  }
}

function writeEntries(entries: readonly ComposedEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMPOSED_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded / storage disabled */ }
}

/** The ids pinned for `examKey`, in exam order, or undefined when none are stored. */
export function getComposedIds(examKey: string): string[] | undefined {
  return readEntries().find(e => e.key === examKey)?.ids;
}

/**
 * Pins `ids` (exam order) for `examKey` as the most recent entry, replacing an older pin of that key,
 * and keeps the MAX_COMPOSED most recent keys. An empty key or id list is ignored.
 */
export function saveComposedIds(examKey: string, ids: readonly string[]): void {
  if (examKey === '' || ids.length === 0) return;
  const others = readEntries().filter(e => e.key !== examKey);
  writeEntries([{ key: examKey, ids: [...ids] }, ...others].slice(0, MAX_COMPOSED));
}
