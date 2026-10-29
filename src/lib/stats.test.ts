import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '@/types';
import { addDays } from './date';
import { getStreak } from './storage';
import {
  addActivity,
  clearCStats,
  clearQStats,
  getActivity,
  getCStats,
  getDeckQuestionIds,
  getDueCardIds,
  getDueQuestionIds,
  getMockRecords,
  getQStats,
  gradeCard,
  migrateLegacyStats,
  recordAnswers,
  removeFromDeck,
  saveMockRecord,
} from './stats';
import type { MockRecord, QStat } from './stats';

const NOW = new Date(2026, 9, 29, 9, 30); // local time → day key 2026-10-29
const TODAY = '2026-10-29';
const TOMORROW = '2026-10-30';
const AT = NOW.toISOString();
const KEYS = {
  qstats: 'bigdata-cbt-qstats',
  cstats: 'bigdata-cbt-cstats',
  activity: 'bigdata-cbt-activity',
  mocks: 'bigdata-cbt-mocks',
  migrated: 'bigdata-cbt-migrated-v2',
  answers: 'bigdata-cbt-answers',
  history: 'bigdata-cbt-history',
  wrongStats: 'bigdata-cbt-wrong-stats',
  streak: 'bigdata-cbt-streak',
} as const;

function seed(key: string, value: unknown): void {
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

function stat(overrides: Partial<QStat> = {}): QStat {
  return { n: 1, c: 1, first: true, ok: true, unsure: false, last: AT, ...overrides };
}

function mock(overrides: Partial<MockRecord> = {}): MockRecord {
  return {
    key: 'mock-1', date: AT, score: 62.5, passed: true, subjectScores: [55, 60, 70, 65],
    total: 80, correct: 50, timeTaken: 5400, strict: true, shuffled: true, ...overrides,
  };
}

function question(id: string, answer: number): Question {
  return {
    id, session: '', sessionId: id.slice(0, id.lastIndexOf('-')), subject: 1, subjectName: '',
    number: 1, question: '', options: ['1', '2', '3', '4'], answer, explanation: '',
  };
}

function failWrites(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError');
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('getQStats', () => {
  it('returns {} when missing, corrupt or not an object', () => {
    expect(getQStats()).toEqual({});
    for (const raw of ['{oops', '[1,2]', '42', 'null']) {
      seed(KEYS.qstats, raw);
      expect(getQStats()).toEqual({});
    }
  });

  it('drops malformed entries and malformed deck state', () => {
    seed(KEYS.qstats, {
      good: stat({ srs: { box: 2, due: TODAY } }),
      badCount: { n: 'x', c: 1 },
      negative: { n: -1, c: 0 },
      nothing: null,
      badBox: stat({ srs: { box: 9, due: TODAY } }),
      fractionalBox: { ...stat(), srs: { box: 1.5, due: TODAY } },
      badDue: { ...stat(), srs: { box: 2, due: 'tomorrow' } },
      sparse: { n: 2, c: 1 },
    });
    expect(getQStats()).toStrictEqual({
      good: stat({ srs: { box: 2, due: TODAY } }),
      badBox: stat(),
      fractionalBox: stat(),
      badDue: stat(),
      sparse: { n: 2, c: 1, first: false, ok: false, unsure: false, last: '' },
    });
  });
});

describe('recordAnswers', () => {
  it('creates stats on the first attempt; only wrong or unsure answers enter the deck', () => {
    recordAnswers([
      { id: 'right', correct: true },
      { id: 'unsure', correct: true, unsure: true },
      { id: 'wrong', correct: false },
    ], NOW);
    expect(getQStats()).toStrictEqual({
      right: stat(),
      unsure: stat({ first: false, unsure: true, srs: { box: 1, due: TOMORROW } }),
      wrong: stat({ c: 0, first: false, ok: false, srs: { box: 1, due: TOMORROW } }),
    });
  });

  it('sets `first` only on the very first attempt', () => {
    recordAnswers([{ id: 'a', correct: true }, { id: 'b', correct: false }], NOW);
    const later = new Date(2026, 9, 30, 8);
    vi.setSystemTime(later);
    recordAnswers([{ id: 'a', correct: false }, { id: 'b', correct: true }], later);
    const { a, b } = getQStats();
    expect(a).toStrictEqual(stat({ n: 2, c: 1, ok: false, last: later.toISOString(), srs: { box: 1, due: '2026-10-31' } }));
    expect(b).toStrictEqual(stat({ n: 2, c: 1, first: false, last: later.toISOString(), srs: { box: 2, due: '2026-11-02' } }));
  });

  it.each([
    ['in deck, correct → next box', { box: 2, due: TODAY }, { correct: true }, { box: 3, due: addDays(TODAY, 7) }],
    ['box 5, correct → box 6', { box: 5, due: TODAY }, { correct: true }, { box: 6, due: '2026-12-28' }],
    ['box 6, correct → leaves the deck', { box: 6, due: TODAY }, { correct: true }, undefined],
    ['in deck, correct + unsure → same box', { box: 4, due: TODAY }, { correct: true, unsure: true }, { box: 4, due: addDays(TODAY, 14) }],
    ['in deck, wrong → box 1', { box: 4, due: TODAY }, { correct: false }, { box: 1, due: TOMORROW }],
    ['not in deck, correct → stays out', undefined, { correct: true }, undefined],
    ['not in deck, correct + unsure → box 1', undefined, { correct: true, unsure: true }, { box: 1, due: TOMORROW }],
    ['not in deck, wrong → box 1', undefined, { correct: false }, { box: 1, due: TOMORROW }],
  ])('deck: %s', (_label, prevSrs, answer, expected) => {
    seed(KEYS.qstats, { q: stat(prevSrs ? { srs: prevSrs } : {}) });
    recordAnswers([{ id: 'q', ...answer }], NOW);
    const after = getQStats().q;
    expect(after.srs).toStrictEqual(expected);
    expect('srs' in after).toBe(expected !== undefined);
  });

  it('counts duplicate ids in a batch once, keeping the last event; skips empty ids', () => {
    recordAnswers([
      { id: 'a', correct: false },
      { id: 'b', correct: true },
      { id: 'a', correct: true },
      { id: '', correct: true },
    ], NOW);
    expect(getQStats()).toStrictEqual({ a: stat(), b: stat() });
    expect(getActivity()[TODAY]).toEqual({ q: 2, c: 2, cards: 0, drills: 0 });
  });

  it("adds the batch to today's activity and marks today as a study day", () => {
    seed(KEYS.activity, { [TODAY]: { q: 5, c: 4, cards: 2, drills: 1 } });
    recordAnswers([{ id: 'a', correct: true }, { id: 'b', correct: true, unsure: true }, { id: 'c', correct: false }]);
    expect(getActivity()[TODAY]).toEqual({ q: 8, c: 6, cards: 2, drills: 1 });
    expect(getStreak().days).toEqual([TODAY]);
    expect(getQStats().c.last).toBe(AT); // `now` defaults to the current time
  });

  it('keeps other questions untouched', () => {
    seed(KEYS.qstats, { other: stat({ n: 3, srs: { box: 2, due: TODAY } }) });
    recordAnswers([{ id: 'a', correct: true }], NOW);
    expect(getQStats().other).toStrictEqual(stat({ n: 3, srs: { box: 2, due: TODAY } }));
  });

  it('ignores an empty batch entirely (no activity, no streak)', () => {
    recordAnswers([], NOW);
    recordAnswers([{ id: '', correct: true }], NOW);
    expect(localStorage.length).toBe(0);
  });
});

describe('deck queries', () => {
  beforeEach(() => {
    seed(KEYS.qstats, {
      'q-late': stat({ srs: { box: 3, due: '2026-10-20' } }),
      'q-b2': stat({ srs: { box: 2, due: '2026-10-25' } }),
      'q-b1b': stat({ srs: { box: 1, due: '2026-10-25' } }),
      'q-b1a': stat({ srs: { box: 1, due: '2026-10-25' } }),
      'q-today': stat({ srs: { box: 1, due: TODAY } }),
      'q-future': stat({ srs: { box: 1, due: TOMORROW } }),
      'q-out': stat(),
    });
  });

  it('lists due questions most overdue first, then lower box, then id', () => {
    expect(getDueQuestionIds()).toEqual(['q-late', 'q-b1a', 'q-b1b', 'q-b2', 'q-today']);
    expect(getDueQuestionIds(TOMORROW)).toEqual(['q-late', 'q-b1a', 'q-b1b', 'q-b2', 'q-today', 'q-future']);
    expect(getDueQuestionIds('2026-10-19')).toEqual([]);
  });

  it('lists the whole deck lowest box first, then earliest due, then id', () => {
    expect(getDeckQuestionIds()).toEqual(['q-b1a', 'q-b1b', 'q-today', 'q-future', 'q-b2', 'q-late']);
  });

  it('removes questions from the deck but keeps their stats', () => {
    removeFromDeck(['q-late', 'q-out', 'missing'], NOW);
    const stats = getQStats();
    // `last` is the sync clock: a deck removal must look newer than the server copy
    expect(stats['q-late']).toStrictEqual(stat({ last: NOW.toISOString() }));
    expect(stats['q-out']).toStrictEqual(stat());
    expect(stats).not.toHaveProperty('missing');
    expect(getDeckQuestionIds()).toEqual(['q-b1a', 'q-b1b', 'q-today', 'q-future', 'q-b2']);
  });

  it('does not rewrite storage when none of the ids is in the deck', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    removeFromDeck(['q-out', 'missing']);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears all question stats', () => {
    clearQStats();
    expect(localStorage.getItem(KEYS.qstats)).toBeNull();
    expect(getDeckQuestionIds()).toEqual([]);
  });
});

describe('concept cards', () => {
  it('schedules cards with nextSrs and counts again grades', () => {
    gradeCard('c1', 'good', NOW);
    expect(getCStats().c1).toEqual({ srs: { box: 2, due: '2026-11-01' }, n: 1, again: 0, last: AT });
    gradeCard('c1', 'again', NOW);
    expect(getCStats().c1).toEqual({ srs: { box: 1, due: TOMORROW }, n: 2, again: 1, last: AT });
    gradeCard('c2', 'easy');
    expect(getCStats().c2.srs).toEqual({ box: 4, due: addDays(TODAY, 14) });
  });

  it("adds one card per grade to today's activity and marks a study day", () => {
    gradeCard('c1', 'hard', NOW);
    gradeCard('c2', 'good', NOW);
    expect(getActivity()[TODAY]).toEqual({ q: 0, c: 0, cards: 2, drills: 0 });
    expect(getStreak().days).toEqual([TODAY]);
  });

  it('ignores an empty card id', () => {
    gradeCard('', 'good', NOW);
    expect(localStorage.length).toBe(0);
  });

  it('drops malformed card stats', () => {
    seed(KEYS.cstats, {
      ok: { srs: { box: 3, due: TODAY }, n: 2, again: 1, last: AT },
      noSrs: { n: 1, again: 0, last: AT },
      badAgain: { srs: { box: 1, due: TODAY }, n: 1, again: 'x' },
      noLast: { srs: { box: 1, due: TODAY }, n: 1, again: 0 },
      junk: 'x',
    });
    expect(getCStats()).toEqual({
      ok: { srs: { box: 3, due: TODAY }, n: 2, again: 1, last: AT },
      noLast: { srs: { box: 1, due: TODAY }, n: 1, again: 0, last: '' },
    });
  });

  it('lists due cards most overdue first, then lower box, then id', () => {
    const card = (box: number, due: string) => ({ srs: { box, due }, n: 1, again: 0, last: AT });
    seed(KEYS.cstats, {
      b: card(2, '2026-10-20'),
      a: card(2, '2026-10-20'),
      low: card(1, '2026-10-20'),
      old: card(5, '2026-10-01'),
      later: card(1, '2026-11-01'),
    });
    expect(getDueCardIds()).toEqual(['old', 'low', 'a', 'b']);
    expect(getDueCardIds('2026-11-01')).toEqual(['old', 'low', 'a', 'b', 'later']);
  });

  it('clears card stats', () => {
    gradeCard('c1', 'good', NOW);
    clearCStats();
    expect(getCStats()).toEqual({});
    expect(getDueCardIds('2027-01-01')).toEqual([]);
  });
});

describe('activity', () => {
  it('reads only day-keyed objects and defaults bad counters to 0', () => {
    seed(KEYS.activity, {
      [TODAY]: { q: 3, c: 'x', cards: 1 },
      'not-a-day': { q: 1, c: 1, cards: 1, drills: 1 },
      '2026-10-28': 7,
      '2026-10-27': { q: -2, c: 1, cards: 0, drills: 4 },
    });
    expect(getActivity()).toEqual({
      [TODAY]: { q: 3, c: 0, cards: 1, drills: 0 },
      '2026-10-27': { q: 0, c: 1, cards: 0, drills: 4 },
    });
    seed(KEYS.activity, '[]');
    expect(getActivity()).toEqual({});
  });

  it('merges counters per day key and marks the study day', () => {
    addActivity({ drills: 10 }, NOW);
    addActivity({ drills: 5, q: 2, c: 1 });
    addActivity({ cards: 3 }, new Date(2026, 9, 30, 7));
    expect(getActivity()).toEqual({
      [TODAY]: { q: 2, c: 1, cards: 0, drills: 15 },
      [TOMORROW]: { q: 0, c: 0, cards: 3, drills: 0 },
    });
    expect(getStreak().days).toEqual([TODAY]); // recordStudyToday() follows the system clock
  });

  it('ignores invalid or all-zero deltas without marking a study day', () => {
    addActivity({ q: -3, c: Number.NaN, drills: 0 }, NOW);
    addActivity({}, NOW);
    expect(localStorage.length).toBe(0);
  });
});

describe('mock records', () => {
  it('upserts by key + date and returns records oldest first', () => {
    saveMockRecord(mock({ key: 'b', date: '2026-10-20T10:00:00.000Z' }));
    saveMockRecord(mock({ key: 'a', date: '2026-10-10T10:00:00.000Z' }));
    saveMockRecord(mock({ key: 'b', date: '2026-10-20T10:00:00.000Z', score: 80 }));
    saveMockRecord(mock({ key: 'b', date: '2026-10-25T10:00:00.000Z', score: 40 }));
    expect(getMockRecords().map(r => [r.key, r.score])).toEqual([['a', 62.5], ['b', 80], ['b', 40]]);
  });

  it('keeps only the latest 100 records', () => {
    for (let i = 0; i < 105; i++) {
      saveMockRecord(mock({ key: `mock-${i}`, date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }));
    }
    const records = getMockRecords();
    expect(records).toHaveLength(100);
    expect(records[0].key).toBe('mock-5');
    expect(records[99].key).toBe('mock-104');
  });

  it('drops malformed records on read and refuses to save them', () => {
    seed(KEYS.mocks, [
      mock(),
      { ...mock(), score: 'high' },
      { ...mock(), date: 'yesterday' },
      { ...mock(), subjectScores: [1, 'x'] },
      { ...mock(), key: '' },
      null,
    ]);
    expect(getMockRecords()).toEqual([mock()]);
    saveMockRecord(mock({ key: 'nan', score: Number.NaN }));
    expect(getMockRecords()).toEqual([mock()]);
    seed(KEYS.mocks, '{"not":"a list"}');
    expect(getMockRecords()).toEqual([]);
  });
});

describe('migrateLegacyStats', () => {
  const BANK = [question('5-1', 1), question('5-2', 2), question('5-3', 3), question('6-1', 4), question('6-2', 1)];
  const MAR = '2026-03-01T10:00:00.000Z';
  const FEB = '2026-02-01T10:00:00.000Z';

  it('imports each question once from its most recent exam record', () => {
    seed(KEYS.history, [
      { key: 'session-5', score: 60, passed: true, date: MAR },
      { key: 'pool-wrong', score: 50, passed: false, date: FEB },
    ]);
    seed(KEYS.answers, {
      'session-5': { '5-1': 1, '5-2': 3 },
      'pool-wrong': { '5-1': 4, '5-2': 2 }, // older but stored later: must not win
      all: { '5-1': 2, '6-1': 4 }, // no history record → treated as oldest
      'session-9': { '9-1': 1, '5-3': '3' }, // not in the bank / not a number
    });
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(getQStats()).toStrictEqual({
      '5-1': stat({ last: MAR }),
      '5-2': stat({ c: 0, first: false, ok: false, last: MAR }),
      '6-1': stat({ last: AT }),
    });
    expect(localStorage.getItem(KEYS.migrated)).toBe('1');
    expect(localStorage.getItem(KEYS.activity)).toBeNull();
    expect(localStorage.getItem(KEYS.streak)).toBeNull();
  });

  it('moves legacy wrongs into the deck: active → box 1 today, graduated → box 2 in 3 days', () => {
    seed(KEYS.history, [{ key: 'session-5', score: 60, passed: true, date: MAR }]);
    seed(KEYS.answers, { 'session-5': { '5-1': 1, '5-2': 1 } });
    seed(KEYS.wrongStats, {
      '5-1': { wrongCount: 1, lastWrongAt: FEB, graduated: true }, // wrong once, right in the latest exam
      '5-2': { wrongCount: 2, lastWrongAt: MAR, graduated: false },
      '5-3': { wrongCount: 1, lastWrongAt: FEB, graduated: true }, // its answer record is gone
      '6-1': { wrongCount: 0, lastWrongAt: FEB, graduated: false }, // never actually wrong
      '6-2': { wrongCount: 1, lastWrongAt: 'garbage', graduated: false },
      'gone-1': { wrongCount: 3, lastWrongAt: FEB, graduated: false }, // no longer in the bank
    });
    expect(migrateLegacyStats(BANK)).toBe(true);
    expect(getQStats()).toStrictEqual({
      '5-1': stat({ first: false, last: MAR, srs: { box: 2, due: '2026-11-01' } }),
      '5-2': stat({ c: 0, first: false, ok: false, last: MAR, srs: { box: 1, due: TODAY } }),
      '5-3': stat({ first: false, last: FEB, srs: { box: 2, due: '2026-11-01' } }),
      '6-2': stat({ c: 0, first: false, ok: false, last: AT, srs: { box: 1, due: TODAY } }),
    });
    expect(getDueQuestionIds()).toEqual(['5-2', '6-2']);
  });

  it('never overwrites an existing QStat', () => {
    const existing = stat({ n: 7, c: 2, first: false, ok: false });
    seed(KEYS.qstats, { '5-1': existing });
    seed(KEYS.answers, { 'session-5': { '5-1': 1, '5-2': 2 } });
    seed(KEYS.wrongStats, { '5-1': { wrongCount: 1, lastWrongAt: FEB, graduated: false } });
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(getQStats()).toStrictEqual({ '5-1': existing, '5-2': stat() });
  });

  it('runs once: later calls are no-ops even when legacy data changes', () => {
    seed(KEYS.answers, { 'session-5': { '5-1': 1 } });
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    const after = localStorage.getItem(KEYS.qstats);
    seed(KEYS.answers, { 'session-5': { '5-1': 1, '5-2': 2 } });
    expect(migrateLegacyStats(BANK, NOW)).toBe(false);
    expect(localStorage.getItem(KEYS.qstats)).toBe(after);
  });

  it('tolerates corrupt legacy data and still completes', () => {
    seed(KEYS.answers, '[1,2]');
    seed(KEYS.wrongStats, '"text"');
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(localStorage.getItem(KEYS.qstats)).toBeNull();
    expect(localStorage.getItem(KEYS.migrated)).toBe('1');
  });

  it('treats every exam as undated when the history is corrupt', () => {
    seed(KEYS.history, { not: 'a list' });
    seed(KEYS.answers, { 'session-5': { '5-1': 1 }, 'session-6': { '6-1': 1 } });
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(getQStats()).toStrictEqual({ '5-1': stat(), '6-1': stat({ c: 0, first: false, ok: false }) });
  });

  it('skips malformed legacy entries', () => {
    seed(KEYS.history, [null, { key: 1, date: MAR }, { key: 'session-6', date: 'never' }, { key: 'session-6', date: 20260301 }]);
    seed(KEYS.answers, { 'session-5': 5, 'session-6': { '6-1': 4 } });
    seed(KEYS.wrongStats, { '5-1': null, '5-2': { wrongCount: 'many', graduated: false } });
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(getQStats()).toStrictEqual({ '6-1': stat() });
  });

  it('leaves the flag unset (so it can retry) without a bank or when the write fails', () => {
    seed(KEYS.answers, { 'session-5': { '5-1': 1 } });
    expect(migrateLegacyStats([], NOW)).toBe(false);
    failWrites();
    expect(migrateLegacyStats(BANK, NOW)).toBe(false);
    vi.restoreAllMocks();
    expect(localStorage.getItem(KEYS.migrated)).toBeNull();
    expect(migrateLegacyStats(BANK, NOW)).toBe(true);
    expect(getQStats()).toStrictEqual({ '5-1': stat() });
  });
});

describe('storage failures and the server', () => {
  it('treats unreadable storage as empty', () => {
    seed(KEYS.qstats, { a: stat() });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(getQStats()).toEqual({});
    expect(getMockRecords()).toEqual([]);
  });

  it('never throws when writes or removals fail', () => {
    failWrites();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => {
      recordAnswers([{ id: 'a', correct: false }], NOW);
      gradeCard('c', 'good', NOW);
      addActivity({ drills: 1 }, NOW);
      saveMockRecord(mock());
      clearQStats();
      clearCStats();
    }).not.toThrow();
  });

  it('reads empty and writes nothing on the server', () => {
    seed(KEYS.qstats, { a: stat({ srs: { box: 1, due: TODAY } }) });
    seed(KEYS.answers, { 'session-5': { '5-2': 2 } });
    vi.stubGlobal('window', undefined);
    expect(getQStats()).toEqual({});
    expect(getDueQuestionIds(TODAY)).toEqual([]);
    expect(getCStats()).toEqual({});
    expect(getActivity()).toEqual({});
    expect(getMockRecords()).toEqual([]);
    recordAnswers([{ id: 'b', correct: false }], NOW);
    gradeCard('c', 'good', NOW);
    addActivity({ q: 1 }, NOW);
    saveMockRecord(mock());
    removeFromDeck(['a']);
    clearQStats();
    clearCStats();
    expect(migrateLegacyStats([question('5-2', 2)], NOW)).toBe(false);
    vi.unstubAllGlobals();
    expect(localStorage.length).toBe(2);
    expect(getQStats()).toStrictEqual({ a: stat({ srs: { box: 1, due: TODAY } }) });
  });
});
