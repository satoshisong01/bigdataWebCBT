/**
 * One adapter per sync namespace (docs §7.4). Each maps a localStorage structure to records
 * (key → JSON value) and applies remote upserts / tombstones back in exactly the format that
 * src/lib/storage.ts, src/lib/stats.ts and src/lib/settings.ts read and write.
 */
import { addDays, diffDays, isDayKey } from '@/lib/date';
import type { SyncNs } from './protocol';
import { isRecord, readJson, writeJson, type StorageGetter } from './store';

export const SYNC_STORAGE_KEYS = {
  qstat: 'bigdata-cbt-qstats',
  cstat: 'bigdata-cbt-cstats',
  activity: 'bigdata-cbt-activity',
  mock: 'bigdata-cbt-mocks',
  history: 'bigdata-cbt-history',
  wrong: 'bigdata-cbt-wrong',
  retry: 'bigdata-cbt-retry-ctx',
  answers: 'bigdata-cbt-answers',
  bookmark: 'bigdata-cbt-bookmarks',
  studyday: 'bigdata-cbt-streak',
  settings: 'bigdata-cbt-settings',
} as const satisfies Record<SyncNs, string>;

/** Key of the single record in the 'settings' namespace. */
export const SETTINGS_RECORD_KEY = 'settings';
/** saveMockRecord keeps the latest 100 records. */
const MAX_MOCKS = 100;
/** 9999-12-31T23:59:59.999Z — later dates no longer serialize as plain ISO. */
const MAX_ISO_MS = 253_402_300_799_999;

export interface AdapterChange {
  readonly key: string;
  /** null = tombstone */
  readonly value: unknown;
}

export interface StampContext {
  /** ISO date of the local history record with this exam key */
  historyDate(examKey: string): string | undefined;
}

export interface SyncAdapter {
  readonly ns: SyncNs;
  /** local removals become tombstones and remote tombstones delete; otherwise tombstones are ignored */
  readonly deletable: boolean;
  /** localStorage keys holding this namespace (cleared on an account switch) */
  readonly storageKeys: readonly string[];
  read(): Record<string, unknown>;
  /** whether a remote value (null = tombstone) has a shape this namespace can store */
  accepts(key: string, value: unknown): boolean;
  /** the record's own LWW clock (§7.4 "자체 시각") as ISO, when it has one */
  stamp(value: unknown, key: string, ctx: StampContext): string | undefined;
  /** applies a batch of upserts/tombstones with one write; false when storage could not be written */
  apply(changes: readonly AdapterChange[]): boolean;
}

/** Normalized ISO timestamp, or undefined when `v` is not a usable date string. */
export function isoOf(v: unknown): string | undefined {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t >= 0 && t <= MAX_ISO_MS ? new Date(t).toISOString() : undefined;
}

function fieldStamp(field: string): (value: unknown) => string | undefined {
  return value => (isRecord(value) ? isoOf(value[field]) : undefined);
}

const dateStamp = fieldStamp('date');

function noStamp(): undefined {
  return undefined;
}

/** wrong / answers records carry no clock of their own: they are written together with history[key]. */
function historyStamp(_value: unknown, key: string, ctx: StampContext): string | undefined {
  return ctx.historyDate(key);
}

export function stampContextOf(historyRecords: Readonly<Record<string, unknown>>): StampContext {
  return {
    historyDate: key =>
      Object.prototype.hasOwnProperty.call(historyRecords, key) ? dateStamp(historyRecords[key]) : undefined,
  };
}

/** The last change per key — a batch never needs more than one write per record. */
function latestByKey(changes: readonly AdapterChange[]): Map<string, unknown> {
  return new Map(changes.map(c => [c.key, c.value]));
}

function isStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every(item => typeof item === 'string');
}

function storedMap(storage: StorageGetter, key: string): Record<string, unknown> {
  const raw = readJson(storage, key);
  return isRecord(raw) ? raw : {};
}

function storedList(storage: StorageGetter, key: string): unknown[] {
  const raw = readJson(storage, key);
  return Array.isArray(raw) ? raw : [];
}

interface MapSpec {
  ns: SyncNs;
  deletable: boolean;
  isValue: (v: unknown) => boolean;
  isKey?: (k: string) => boolean;
  stamp?: SyncAdapter['stamp'];
}

/** Object maps: -qstats, -cstats, -activity, -wrong, -retry-ctx, -answers. Untouched entries are kept as stored. */
function mapAdapter(storage: StorageGetter, spec: MapSpec): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS[spec.ns];
  const isKey = spec.isKey ?? (() => true);
  return {
    ns: spec.ns,
    deletable: spec.deletable,
    storageKeys: [storageKey],
    read: () =>
      Object.fromEntries(Object.entries(storedMap(storage, storageKey)).filter(([k, v]) => isKey(k) && spec.isValue(v))),
    accepts: (key, value) => value === null || (isKey(key) && spec.isValue(value)),
    stamp: spec.stamp ?? noStamp,
    apply: changes => {
      const current = storedMap(storage, storageKey);
      const updates = [...latestByKey(changes)].filter(([k, v]) =>
        v === null ? spec.deletable && Object.prototype.hasOwnProperty.call(current, k) : isKey(k) && spec.isValue(v),
      );
      if (updates.length === 0) return true;
      const touched = new Set(updates.map(([k]) => k));
      const next = Object.fromEntries([
        ...Object.entries(current).filter(([k]) => !touched.has(k)),
        ...updates.filter(([, v]) => v !== null),
      ]);
      return writeJson(storage, storageKey, next);
    },
  };
}

function examKeyOf(row: unknown): string | undefined {
  return isRecord(row) && typeof row.key === 'string' && row.key !== '' ? row.key : undefined;
}

function upsertRow(rows: readonly unknown[], key: string, row: Record<string, unknown>): unknown[] {
  const at = rows.findIndex(r => examKeyOf(r) === key);
  return at >= 0 ? rows.map((r, i) => (i === at ? row : r)) : [...rows, row];
}

/** -history: ExamRecord[] by exam key; the first row per key counts (like storage.ts getRecord/saveRecord). */
function historyAdapter(storage: StorageGetter): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS.history;
  return {
    ns: 'history',
    deletable: true,
    storageKeys: [storageKey],
    read: () => {
      const records = new Map<string, unknown>();
      for (const row of storedList(storage, storageKey)) {
        const key = examKeyOf(row);
        if (key !== undefined && !records.has(key)) records.set(key, row);
      }
      return Object.fromEntries(records);
    },
    accepts: (_key, value) => value === null || isRecord(value),
    stamp: dateStamp,
    apply: changes => {
      const current = storedList(storage, storageKey);
      const present = new Set(current.map(examKeyOf));
      const updates = [...latestByKey(changes)].filter(([k, v]) => (v === null ? present.has(k) : isRecord(v)));
      if (updates.length === 0) return true;
      const next = updates.reduce<unknown[]>(
        (rows, [key, value]) =>
          isRecord(value) ? upsertRow(rows, key, { ...value, key }) : rows.filter(r => examKeyOf(r) !== key),
        current,
      );
      return writeJson(storage, storageKey, next);
    },
  };
}

/** `key|date` — the identity saveMockRecord upserts by. */
function mockIdOf(row: unknown): string | undefined {
  if (!isRecord(row)) return undefined;
  const { key, date } = row;
  return typeof key === 'string' && key !== '' && typeof date === 'string' && date !== '' ? `${key}|${date}` : undefined;
}

function mockTime(row: unknown): number {
  const t = isRecord(row) && typeof row.date === 'string' ? Date.parse(row.date) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
}

function byMockDate(a: unknown, b: unknown): number {
  const ta = mockTime(a);
  const tb = mockTime(b);
  return ta === tb ? 0 : ta < tb ? -1 : 1;
}

/** -mocks: MockRecord[] in date order; upserts keep the latest 100 (add-only, like saveMockRecord). */
function mockAdapter(storage: StorageGetter): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS.mock;
  return {
    ns: 'mock',
    deletable: false,
    storageKeys: [storageKey],
    read: () =>
      Object.fromEntries(
        storedList(storage, storageKey).flatMap((row): Array<[string, unknown]> => {
          const id = mockIdOf(row);
          return id === undefined ? [] : [[id, row]];
        }),
      ),
    accepts: (key, value) => value === null || mockIdOf(value) === key,
    stamp: dateStamp,
    apply: changes => {
      const incoming = new Map([...latestByKey(changes)].filter(([id, v]) => mockIdOf(v) === id));
      if (incoming.size === 0) return true;
      const kept = storedList(storage, storageKey).filter(row => {
        const id = mockIdOf(row);
        return id === undefined || !incoming.has(id);
      });
      return writeJson(storage, storageKey, [...kept, ...incoming.values()].sort(byMockDate).slice(-MAX_MOCKS));
    },
  };
}

/** -bookmarks: string[] of question ids; a record (value true) per bookmark. */
function bookmarkAdapter(storage: StorageGetter): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS.bookmark;
  return {
    ns: 'bookmark',
    deletable: true,
    storageKeys: [storageKey],
    read: () =>
      Object.fromEntries(
        storedList(storage, storageKey)
          .filter((id): id is string => typeof id === 'string' && id !== '')
          .map(id => [id, true]),
      ),
    accepts: key => key !== '',
    stamp: noStamp,
    apply: changes => {
      const wanted = latestByKey(changes);
      const current = storedList(storage, storageKey);
      const kept = current.filter(id => typeof id !== 'string' || wanted.get(id) !== null);
      const present = new Set(kept);
      const added = [...wanted]
        .filter(([id, v]) => v !== null && id !== '' && !present.has(id))
        .map(([id]) => id);
      if (added.length === 0 && kept.length === current.length) return true;
      return writeJson(storage, storageKey, [...kept, ...added]);
    },
  };
}

/** Same shape as storage.ts StreakData. */
export interface StreakRecord {
  days: string[];
  current: number;
  best: number;
}

function runEndingAt(studied: ReadonlySet<string>, last: string | undefined): number {
  let count = 0;
  let day = last;
  while (day !== undefined && studied.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

function longestRun(sortedDays: readonly string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const day of sortedDays) {
    run = prev !== undefined && diffDays(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/**
 * The rules of storage.ts recordStudyToday: sorted unique days, current = the run ending on the latest
 * study day (what recordStudyToday stored that day), best = longest run, never below the previous best.
 */
export function computeStreak(days: readonly string[], prevBest: number): StreakRecord {
  const sorted = Array.from(new Set(days)).sort();
  const valid = sorted.filter(isDayKey);
  return {
    days: sorted,
    current: runEndingAt(new Set(valid), valid[valid.length - 1]),
    best: Math.max(longestRun(valid), prevBest),
  };
}

/** -streak: study days are only ever added (union); current/best are recomputed. */
function studydayAdapter(storage: StorageGetter): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS.studyday;
  const daysOf = (streak: Readonly<Record<string, unknown>>): string[] =>
    Array.isArray(streak.days) ? streak.days.filter((d): d is string => typeof d === 'string') : [];
  return {
    ns: 'studyday',
    deletable: false,
    storageKeys: [storageKey],
    read: () => Object.fromEntries(daysOf(storedMap(storage, storageKey)).filter(isDayKey).map(day => [day, true])),
    accepts: key => isDayKey(key),
    stamp: noStamp,
    apply: changes => {
      const streak = storedMap(storage, storageKey);
      const days = daysOf(streak);
      const known = new Set(days);
      const added = [...latestByKey(changes)]
        .filter(([day, v]) => v !== null && isDayKey(day) && !known.has(day))
        .map(([day]) => day);
      if (added.length === 0) return true;
      const prevBest = typeof streak.best === 'number' && Number.isFinite(streak.best) ? streak.best : 0;
      return writeJson(storage, storageKey, computeStreak([...days, ...added], prevBest));
    },
  };
}

/** -settings: the raw stored object (settings.ts validates every field when reading it). */
function settingsAdapter(storage: StorageGetter): SyncAdapter {
  const storageKey = SYNC_STORAGE_KEYS.settings;
  return {
    ns: 'settings',
    deletable: false,
    storageKeys: [storageKey],
    read: () => {
      const raw = readJson(storage, storageKey);
      return isRecord(raw) ? { [SETTINGS_RECORD_KEY]: raw } : {};
    },
    accepts: (key, value) => key === SETTINGS_RECORD_KEY && (value === null || isRecord(value)),
    stamp: noStamp,
    apply: changes => {
      const value = latestByKey(changes).get(SETTINGS_RECORD_KEY);
      return isRecord(value) ? writeJson(storage, storageKey, value) : true;
    },
  };
}

/** Every namespace of SYNC_NAMESPACES, in that order. */
export function createAdapters(storage: StorageGetter): readonly SyncAdapter[] {
  return [
    mapAdapter(storage, { ns: 'qstat', deletable: true, isValue: isRecord, stamp: fieldStamp('last') }),
    mapAdapter(storage, { ns: 'cstat', deletable: true, isValue: isRecord, stamp: fieldStamp('last') }),
    mapAdapter(storage, { ns: 'activity', deletable: false, isValue: isRecord, isKey: isDayKey }),
    mockAdapter(storage),
    historyAdapter(storage),
    mapAdapter(storage, { ns: 'wrong', deletable: true, isValue: isStringArray, stamp: historyStamp }),
    mapAdapter(storage, { ns: 'retry', deletable: true, isValue: isRecord }),
    mapAdapter(storage, { ns: 'answers', deletable: true, isValue: isRecord, stamp: historyStamp }),
    bookmarkAdapter(storage),
    studydayAdapter(storage),
    settingsAdapter(storage),
  ];
}
