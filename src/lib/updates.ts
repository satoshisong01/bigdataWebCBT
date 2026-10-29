import type { SiteUpdate } from '@/data/updates';

/** Device-local: id of the newest update this device has opened the 🔔 panel on. */
export const UPDATES_SEEN_KEY = 'bigdata-cbt-updates-seen';

export function getSeenUpdateId(): string | null {
  try {
    return localStorage.getItem(UPDATES_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markUpdatesSeen(updates: readonly SiteUpdate[]): void {
  if (updates.length === 0) return;
  try {
    localStorage.setItem(UPDATES_SEEN_KEY, updates[0].id);
  } catch { /* storage unavailable — the badge simply stays */ }
}

/** Ids of updates newer than `seenId` (all of them when nothing was seen or the id is unknown). */
export function unseenUpdateIds(updates: readonly SiteUpdate[], seenId: string | null): string[] {
  const idx = seenId === null ? -1 : updates.findIndex(u => u.id === seenId);
  return (idx === -1 ? updates : updates.slice(0, idx)).map(u => u.id);
}
