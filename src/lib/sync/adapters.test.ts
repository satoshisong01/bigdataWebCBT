import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, todayKey } from '@/lib/date';
import { getSettings, saveSettings } from '@/lib/settings';
import { getActivity, getCStats, getMockRecords, getQStats, gradeCard, recordAnswers, saveMockRecord } from '@/lib/stats';
import {
  getBookmarks, getExamAnswers, getHistory, getRetryContext, getStreak, getWrongIds, recordStudyToday,
  saveExamAnswers, saveRecord, saveRetryContext, saveWrongIds, toggleBookmark,
} from '@/lib/storage';
import { SYNC_NAMESPACES, type SyncNs } from './protocol';
import {
  SYNC_STORAGE_KEYS as K, computeStreak, createAdapters, isoOf, stampContextOf, type SyncAdapter,
} from './adapters';
import { browserStorage } from './store';
import { activity, examRecord, mockRecord, qstat } from './testing/fixtures';
import { createMemoryStorage } from './testing/memoryStorage';

const adapters = createAdapters(browserStorage);

function adapter(ns: SyncNs): SyncAdapter {
  const found = adapters.find(a => a.ns === ns);
  if (!found) throw new Error(`no adapter for ${ns}`);
  return found;
}

function stored(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
}

function apply(ns: SyncNs, changes: Array<[string, unknown]>): boolean {
  return adapter(ns).apply(changes.map(([key, value]) => ({ key, value })));
}

const T1 = '2026-10-20T09:00:00.000Z';
const T2 = '2026-10-21T09:00:00.000Z';

beforeEach(() => {
  localStorage.clear();
});

describe('createAdapters', () => {
  it('covers every namespace in protocol order with its storage key', () => {
    expect(adapters.map(a => a.ns)).toEqual([...SYNC_NAMESPACES]);
    expect(adapters.map(a => a.storageKeys)).toEqual(SYNC_NAMESPACES.map(ns => [K[ns]]));
    expect(adapters.filter(a => a.deletable).map(a => a.ns)).toEqual(
      ['qstat', 'cstat', 'history', 'wrong', 'retry', 'answers', 'bookmark'],
    );
  });
});

describe('round trip through the app modules', () => {
  it('rebuilds exactly what storage.ts, stats.ts and settings.ts wrote', () => {
    const now = new Date('2026-10-29T09:00:00.000Z');
    recordAnswers([{ id: '6-1', correct: true }, { id: '6-2', correct: false }, { id: '6-3', correct: true, unsure: true }], now);
    gradeCard('card-1', 'good', now);
    saveMockRecord(mockRecord('mock-1', '2026-10-28T09:00:00.000Z'));
    saveMockRecord(mockRecord('mock-2', '2026-10-27T09:00:00.000Z'));
    saveRecord(examRecord('session-6', '2026-10-29T08:00:00.000Z'));
    saveRecord(examRecord('session-7', '2026-10-28T08:00:00.000Z'));
    saveWrongIds('session-6', ['6-2']);
    saveExamAnswers('session-6', { '6-1': 4, '6-2': 1 });
    saveRetryContext('session-6', { totals: { 1: 3 }, baseCorrect: { 1: 2 } });
    toggleBookmark('6-2');
    toggleBookmark('6-9');
    saveSettings({ dailyQuestionGoal: 70, shuffleOptions: false });

    const raw = () => Object.fromEntries(SYNC_NAMESPACES.map(ns => [ns, stored(K[ns])]));
    const before = raw();
    const records = adapters.map(a => [a, a.read()] as const);
    localStorage.clear();
    records.forEach(([a, r]) => expect(a.apply(Object.entries(r).map(([key, value]) => ({ key, value })))).toBe(true));
    expect(raw()).toEqual(before);

    expect(getQStats()['6-3']).toMatchObject({ n: 1, c: 1, unsure: true, srs: { box: 1 } });
    expect(getCStats()['card-1'].n).toBe(1);
    expect(getMockRecords().map(r => r.key)).toEqual(['mock-2', 'mock-1']);
    expect(getHistory().map(r => r.key)).toEqual(['session-6', 'session-7']);
    expect(getWrongIds('session-6')).toEqual(['6-2']);
    expect(getExamAnswers('session-6')).toEqual({ '6-1': 4, '6-2': 1 });
    expect(getRetryContext('session-6')).toEqual({ totals: { 1: 3 }, baseCorrect: { 1: 2 } });
    expect(getBookmarks()).toEqual(['6-2', '6-9']);
    expect(getStreak()).toEqual({ days: [todayKey()], current: 1, best: 1 });
    expect(getSettings()).toMatchObject({ dailyQuestionGoal: 70, shuffleOptions: false });
  });
});

describe('object maps', () => {
  it('sets and deletes entries, keeping untouched (even invalid) ones as stored', () => {
    localStorage.setItem(K.qstat, JSON.stringify({ a: qstat(T1), b: qstat(T1), junk: 5 }));
    expect(adapter('qstat').read()).toEqual({ a: qstat(T1), b: qstat(T1) });
    expect(apply('qstat', [['a', null], ['c', qstat(T2)], ['d', 'not a record'], ['b', qstat(T1, 3, 2)]])).toBe(true);
    expect(stored(K.qstat)).toEqual({ junk: 5, b: qstat(T1, 3, 2), c: qstat(T2) });
  });

  it('uses the last change per key within a batch', () => {
    apply('cstat', [['c', { n: 1 }], ['c', null], ['c', { n: 2 }]]);
    expect(stored(K.cstat)).toEqual({ c: { n: 2 } });
  });

  it('never deletes activity days and only accepts day keys', () => {
    localStorage.setItem(K.activity, JSON.stringify({ '2026-10-20': activity(1, 1), oops: activity(9, 9) }));
    expect(adapter('activity').read()).toEqual({ '2026-10-20': activity(1, 1) });
    apply('activity', [['2026-10-20', null], ['not-a-day', activity(2, 2)], ['2026-10-21', activity(3, 2)]]);
    expect(getActivity()).toEqual({ '2026-10-20': activity(1, 1), '2026-10-21': activity(3, 2) });
  });

  it('accepts only id lists for wrong and records for retry/answers', () => {
    localStorage.setItem(K.wrong, JSON.stringify({ a: ['1'], b: 'x', c: [1] }));
    expect(adapter('wrong').read()).toEqual({ a: ['1'] });
    apply('wrong', [['d', ['2', '3']], ['e', [4]]]);
    expect(getWrongIds('d')).toEqual(['2', '3']);
    expect(getWrongIds('e')).toEqual([]);
    apply('retry', [['r', [1, 2]], ['s', { totals: {}, baseCorrect: {} }]]);
    expect(stored(K.retry)).toEqual({ s: { totals: {}, baseCorrect: {} } });
    apply('answers', [['s', null]]);
    expect(stored(K.answers)).toBeUndefined(); // nothing to delete → no write
  });
});

describe('arrays', () => {
  it('history: first row per key wins, upserts in place, tombstones remove every copy', () => {
    localStorage.setItem(K.history, JSON.stringify([examRecord('a', T1), examRecord('b', T1), examRecord('a', T2), 7]));
    expect(adapter('history').read()).toEqual({ a: examRecord('a', T1), b: examRecord('b', T1) });
    apply('history', [['a', examRecord('wrong-key', T2, 90)]]);
    expect(getHistory()[0]).toEqual(examRecord('a', T2, 90));
    apply('history', [['a', null], ['c', examRecord('c', T2)], ['b', 'bad']]);
    expect(stored(K.history)).toEqual([examRecord('b', T1), 7, examRecord('c', T2)]);
  });

  it('mock: upserts by key|date, keeps the latest 100 in date order, ignores tombstones and mismatched keys', () => {
    const rows = Array.from({ length: 105 }, (_, i) => mockRecord(`mock-${i}`, new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString()));
    const shuffled = [...rows.slice(50), ...rows.slice(0, 50)];
    expect(apply('mock', shuffled.map(r => [`${r.key}|${r.date}`, r]))).toBe(true);
    const kept = getMockRecords();
    expect(kept).toHaveLength(100);
    expect([kept[0].key, kept[99].key]).toEqual(['mock-5', 'mock-104']);
    const last = rows[104];
    apply('mock', [['x|y', rows[0]], [`${last.key}|${last.date}`, null]]);
    expect(getMockRecords()).toEqual(kept);
    apply('mock', [[`${last.key}|${last.date}`, { ...last, score: 99 }]]);
    expect(getMockRecords().filter(r => r.key === last.key).map(r => r.score)).toEqual([99]);
  });

  it('bookmark: removes and appends while keeping the stored order', () => {
    toggleBookmark('q1');
    toggleBookmark('q2');
    expect(adapter('bookmark').read()).toEqual({ q1: true, q2: true });
    apply('bookmark', [['q1', null], ['q3', true], ['q2', true], ['', true]]);
    expect(getBookmarks()).toEqual(['q2', 'q3']);
    localStorage.setItem(K.bookmark, '"corrupt"');
    expect(apply('bookmark', [['q4', true]])).toBe(true);
    expect(getBookmarks()).toEqual(['q4']);
  });
});

describe('study days', () => {
  it('adds days only and recomputes current/best', () => {
    localStorage.setItem(K.studyday, JSON.stringify({ days: ['2026-10-26', '2026-10-27'], current: 2, best: 6 }));
    expect(adapter('studyday').read()).toEqual({ '2026-10-26': true, '2026-10-27': true });
    apply('studyday', [['2026-10-28', true], ['2026-10-26', null], ['nope', true]]);
    expect(getStreak()).toEqual({ days: ['2026-10-26', '2026-10-27', '2026-10-28'], current: 3, best: 6 });
    expect(apply('studyday', [['2026-10-27', true]])).toBe(true); // already known: no write
  });

  it('computes the streak the way recordStudyToday stores it', () => {
    const today = todayKey();
    const days = [addDays(today, -3), addDays(today, -2), addDays(today, -1)];
    localStorage.setItem(K.studyday, JSON.stringify({ days, current: 3, best: 3 }));
    expect(computeStreak([...days, today], 3)).toEqual(recordStudyToday());
  });

  it('counts the run ending on the latest day and never lowers best', () => {
    expect(computeStreak(['2026-10-03', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-02'], 0)).toEqual({
      days: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'], current: 1, best: 3,
    });
    expect(computeStreak(['2026-12-31', '2027-01-01'], 0)).toMatchObject({ current: 2, best: 2 });
    expect(computeStreak([], 4)).toEqual({ days: [], current: 0, best: 4 });
  });
});

describe('settings', () => {
  it('syncs the raw stored object as one record', () => {
    saveSettings({ dailyCardGoal: 20 });
    expect(adapter('settings').read()).toEqual({ settings: stored(K.settings) });
    apply('settings', [['settings', { examDate: '2027-04-10', later: true }]]);
    expect(stored(K.settings)).toEqual({ examDate: '2027-04-10', later: true });
    apply('settings', [['settings', null], ['other', { examDate: '2027-05-01' }], ['settings', [1]]]);
    expect(stored(K.settings)).toEqual({ examDate: '2027-04-10', later: true });
    expect(getSettings().examDate).toBe('2027-04-10');
  });
});

describe('accepts', () => {
  it('admits tombstones and the shapes each namespace stores, nothing else', () => {
    const cases: Array<[SyncNs, string, unknown, boolean]> = [
      ['qstat', 'q', qstat(T1), true],
      ['qstat', 'q', 'packed', false],
      ['qstat', 'q', null, true],
      ['activity', '2026-10-20', activity(1, 1), true],
      ['activity', 'today', activity(1, 1), false],
      ['wrong', 'k', ['a'], true],
      ['wrong', 'k', { ids: [] }, false],
      ['history', 'k', examRecord('k', T1), true],
      ['history', 'k', 3, false],
      ['mock', `m|${T1}`, mockRecord('m', T1), true],
      ['mock', 'other|key', mockRecord('m', T1), false],
      ['mock', `m|${T1}`, null, true],
      ['bookmark', 'q', true, true],
      ['bookmark', '', true, false],
      ['studyday', '2026-10-20', true, true],
      ['studyday', 'yesterday', true, false],
      ['settings', 'settings', { examDate: '2027-04-03' }, true],
      ['settings', 'settings', [1], false],
      ['settings', 'other', {}, false],
    ];
    for (const [ns, key, value, ok] of cases) expect([ns, key, adapter(ns).accepts(key, value)]).toEqual([ns, key, ok]);
  });
});

describe('stamps', () => {
  const ctx = stampContextOf({ 'session-6': examRecord('session-6', '2026-10-20T12:00:00Z'), bad: { date: 5 } });

  it('use each record’s own clock per §7.4', () => {
    expect(adapter('qstat').stamp(qstat('2026-10-20T09:00:00Z'), 'q', ctx)).toBe('2026-10-20T09:00:00.000Z');
    expect(adapter('cstat').stamp({ last: '' }, 'c', ctx)).toBeUndefined();
    expect(adapter('mock').stamp(mockRecord('m', '2026-10-21T01:02:03Z'), 'm|x', ctx)).toBe('2026-10-21T01:02:03.000Z');
    expect(adapter('history').stamp(examRecord('h', T2), 'h', ctx)).toBe(T2);
    expect(adapter('wrong').stamp(['x'], 'session-6', ctx)).toBe('2026-10-20T12:00:00.000Z');
    expect(adapter('answers').stamp({}, 'session-6', ctx)).toBe('2026-10-20T12:00:00.000Z');
    expect(adapter('answers').stamp({}, 'session-7', ctx)).toBeUndefined();
    expect(adapter('wrong').stamp([], 'bad', ctx)).toBeUndefined();
    for (const ns of ['activity', 'retry', 'bookmark', 'studyday', 'settings'] as const) {
      expect(adapter(ns).stamp({ last: T1, date: T1 }, 'k', ctx)).toBeUndefined();
    }
  });

  it('normalize to ISO and reject unusable dates', () => {
    expect(isoOf('2026-10-29')).toBe('2026-10-29T00:00:00.000Z');
    expect(isoOf('2026-10-29T18:00:00+09:00')).toBe('2026-10-29T09:00:00.000Z');
    expect(isoOf('nope')).toBeUndefined();
    expect(isoOf(5)).toBeUndefined();
    expect(isoOf('1969-12-31T23:59:59Z')).toBeUndefined();
    expect(isoOf('+275760-09-13T00:00:00.000Z')).toBeUndefined();
  });
});

describe('storage failures', () => {
  it('report false when a write fails and true when nothing had to be written', () => {
    const mem = createMemoryStorage();
    mem.failKeys.add('*');
    const broken = createAdapters(() => mem);
    for (const a of broken) {
      const value = a.ns === 'mock' ? mockRecord('m', T1) : a.ns === 'wrong' ? ['x'] : a.ns === 'history' ? examRecord('k', T1) : { v: 1 };
      const key = a.ns === 'mock' ? `m|${T1}` : a.ns === 'studyday' ? '2026-10-20' : a.ns === 'activity' ? '2026-10-20' : a.ns === 'settings' ? 'settings' : 'k';
      expect(a.apply([{ key, value }])).toBe(false);
      expect(a.apply([])).toBe(true);
    }
  });
});
