import { beforeEach, describe, expect, it } from 'vitest';
import { SITE_UPDATES, type SiteUpdate } from '@/data/updates';
import { isDayKey } from '@/lib/date';
import { getSeenUpdateId, markUpdatesSeen, unseenUpdateIds, UPDATES_SEEN_KEY } from './updates';

const u = (id: string, date: string): SiteUpdate => ({ id, date, title: id, items: ['x'] });
const LIST = [u('c', '2027-01-15'), u('b', '2027-01-01'), u('a', '2026-12-15')];

describe('unseenUpdateIds', () => {
  it('counts everything when nothing was seen', () => {
    expect(unseenUpdateIds(LIST, null)).toEqual(['c', 'b', 'a']);
  });
  it('counts only updates newer than the seen one', () => {
    expect(unseenUpdateIds(LIST, 'b')).toEqual(['c']);
    expect(unseenUpdateIds(LIST, 'c')).toEqual([]);
  });
  it('treats an unknown seen id as nothing seen', () => {
    expect(unseenUpdateIds(LIST, 'gone')).toEqual(['c', 'b', 'a']);
  });
});

describe('seen marker', () => {
  beforeEach(() => localStorage.clear());
  it('stores the newest id', () => {
    expect(getSeenUpdateId()).toBeNull();
    markUpdatesSeen(LIST);
    expect(localStorage.getItem(UPDATES_SEEN_KEY)).toBe('c');
    expect(unseenUpdateIds(LIST, getSeenUpdateId())).toEqual([]);
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
