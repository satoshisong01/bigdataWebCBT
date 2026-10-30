import type { SiteUpdate } from '@/data/updates';
import { diffDays } from '@/lib/date';

/** 데이터자격검정(K-data) 공식 공지 — collected by /api/notices from the official board. */
export interface OfficialNotice {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  /** plain-text excerpt of the notice body ('' when unavailable) */
  summary: string;
  /** link to the notice on dataq.or.kr */
  url: string;
}

export const NOTICES_API = '/api/notices';

/** One row of the 🔔 panel: a site update (static) or an official notice (fetched). */
export type FeedItem =
  | ({ kind: 'site' } & SiteUpdate)
  | ({ kind: 'official' } & OfficialNotice);

/** Unseen items older than this never count toward the badge (first visit shouldn't show 9+). */
export const UNSEEN_WINDOW_DAYS = 60;
const MAX_SEEN = 300;

/** Device-local list of feed ids the user has already seen. */
export const UPDATES_SEEN_KEY = 'bigdata-cbt-updates-seen';

export function buildFeed(site: readonly SiteUpdate[], notices: readonly OfficialNotice[]): FeedItem[] {
  const items: FeedItem[] = [
    ...site.map(u => ({ kind: 'site' as const, ...u })),
    ...notices.map(n => ({ kind: 'official' as const, ...n })),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function getSeenIds(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(UPDATES_SEEN_KEY);
    if (!raw) return new Set();
    // first release stored a single id string
    if (!raw.startsWith('[')) return new Set([raw]);
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: readonly string[]): void {
  const merged = [...new Set([...ids, ...getSeenIds()])].slice(0, MAX_SEEN);
  try {
    localStorage.setItem(UPDATES_SEEN_KEY, JSON.stringify(merged));
  } catch { /* storage unavailable — the badge simply stays */ }
}

/** Ids of recent items this device has not seen yet. */
export function unseenIds(feed: readonly FeedItem[], seen: ReadonlySet<string>, today: string): string[] {
  return feed.filter(f => !seen.has(f.id) && diffDays(f.date, today) <= UNSEEN_WINDOW_DAYS).map(f => f.id);
}
