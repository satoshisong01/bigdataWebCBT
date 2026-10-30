import { beforeEach, describe, expect, it } from 'vitest';
import { SITE_UPDATES, type SiteUpdate } from '@/data/updates';
import { isDayKey } from '@/lib/date';
import { buildFeed, getSeenIds, markSeen, unseenIds, UPDATES_SEEN_KEY, type OfficialNotice } from './updates';

const site = (id: string, date: string): SiteUpdate => ({ id, date, title: id, items: ['x'] });
const notice = (id: string, date: string): OfficialNotice => ({ id, date, title: id, summary: '', url: 'https://www.dataq.or.kr/x' });

describe('buildFeed', () => {
  it('merges site updates and official notices newest first', () => {
    const feed = buildFeed([site('s1', '2026-10-30')], [notice('n1', '2026-11-02'), notice('n0', '2026-09-11')]);
    expect(feed.map(f => [f.id, f.kind])).toEqual([['n1', 'official'], ['s1', 'site'], ['n0', 'official']]);
  });
});

describe('unseenIds', () => {
  const feed = buildFeed([site('s1', '2026-10-30')], [notice('n1', '2026-11-02'), notice('old', '2026-06-01')]);
  it('counts recent unseen items only', () => {
    expect(unseenIds(feed, new Set(), '2026-11-03')).toEqual(['n1', 's1']);
    expect(unseenIds(feed, new Set(['s1']), '2026-11-03')).toEqual(['n1']);
  });
  it('ignores items older than the window even when unseen', () => {
    expect(unseenIds(feed, new Set(), '2027-03-01')).toEqual([]);
  });
});

describe('seen ids', () => {
  beforeEach(() => localStorage.clear());
  it('accumulates ids across opens', () => {
    expect(getSeenIds().size).toBe(0);
    markSeen(['a', 'b']);
    markSeen(['c']);
    expect([...getSeenIds()].sort()).toEqual(['a', 'b', 'c']);
  });
  it('reads the first release format (a single id string)', () => {
    localStorage.setItem(UPDATES_SEEN_KEY, '2026-10-30-overhaul');
    expect(getSeenIds().has('2026-10-30-overhaul')).toBe(true);
  });
  it('survives corrupt storage', () => {
    localStorage.setItem(UPDATES_SEEN_KEY, '[not json');
    expect(getSeenIds().size).toBe(0);
  });
});

describe('SITE_UPDATES data', () => {
  it('has unique ids, valid dates, newest first, non-empty content', () => {
    expect(new Set(SITE_UPDATES.map(x => x.id)).size).toBe(SITE_UPDATES.length);
    for (const x of SITE_UPDATES) {
      expect(isDayKey(x.date)).toBe(true);
      expect(x.title.trim()).not.toBe('');
      expect(x.items.length).toBeGreaterThan(0);
    }
    const dates = SITE_UPDATES.map(x => x.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
