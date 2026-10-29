/** Sample study data in the exact localStorage formats of storage.ts / stats.ts / settings.ts (tests only). */
import type { CStat, DayActivity, MockRecord, QStat } from '@/lib/stats';
import type { ExamRecord, RetryContext, StreakData } from '@/lib/storage';
import type { Settings } from '@/lib/settings';
import { SYNC_STORAGE_KEYS as K } from '../adapters';

export const T0 = '2026-10-29T09:00:00.000Z';
export const PASSWORD = 'correct-horse-1';
export const HISTORY_DATE = '2026-10-20T12:00:00.000Z';
export const MOCK_DATE = '2026-10-20T11:00:00.000Z';

export function qstat(last: string, n = 1, c = 1): QStat {
  return { n, c, first: c > 0, ok: c > 0, unsure: false, last };
}

export function cstat(last: string): CStat {
  return { srs: { box: 2, due: '2026-11-01' }, n: 1, again: 0, last };
}

export function activity(q: number, c: number, cards = 0, drills = 0): DayActivity {
  return { q, c, cards, drills };
}

export function mockRecord(key: string, date: string, score = 70): MockRecord {
  return {
    key, date, score, passed: score >= 60, subjectScores: [score, score, score, score],
    total: 80, correct: Math.round(score * 0.8), timeTaken: 3600, strict: true, shuffled: true,
  };
}

export function examRecord(key: string, date: string, score = 65): ExamRecord {
  return { key, score, passed: score >= 60, date };
}

export const SEED_SETTINGS: Partial<Settings> = { planStart: '2026-10-01', dailyQuestionGoal: 50 };
export const SEED_STREAK: StreakData = { days: ['2026-10-19', '2026-10-20'], current: 2, best: 2 };
export const SEED_RETRY: Record<string, RetryContext> = {
  'session-6': { totals: { 1: 20 }, baseCorrect: { 1: 13 } },
};

interface Writable {
  set(key: string, value: unknown): void;
}

/** One record or more in every namespace — 14 records in all (FULL_KEYS). */
export function seedFull(device: Writable): void {
  device.set(K.qstat, { 'q-1': qstat('2026-10-20T09:00:00.000Z'), 'q-2': qstat('2026-10-21T09:00:00.000Z', 2, 1) });
  device.set(K.cstat, { 'c-1': cstat('2026-10-20T10:00:00.000Z') });
  device.set(K.activity, { '2026-10-20': activity(10, 7, 5) });
  device.set(K.mock, [mockRecord('mock-1', MOCK_DATE)]);
  device.set(K.history, [examRecord('session-6', HISTORY_DATE)]);
  device.set(K.wrong, { 'session-6': ['6-3', '6-7'] });
  device.set(K.retry, SEED_RETRY);
  device.set(K.answers, { 'session-6': { '6-1': 2, '6-3': 4 } });
  device.set(K.bookmark, ['q-1', 'q-9']);
  device.set(K.studyday, SEED_STREAK);
  device.set(K.settings, SEED_SETTINGS);
}

export const FULL_KEYS: readonly string[] = [
  'activity|2026-10-20',
  'answers|session-6',
  'bookmark|q-1',
  'bookmark|q-9',
  'cstat|c-1',
  'history|session-6',
  `mock|mock-1|${MOCK_DATE}`,
  'qstat|q-1',
  'qstat|q-2',
  'retry|session-6',
  'settings|settings',
  'studyday|2026-10-19',
  'studyday|2026-10-20',
  'wrong|session-6',
];
