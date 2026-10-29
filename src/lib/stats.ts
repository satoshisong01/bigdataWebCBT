/**
 * CONTRACT — persistent learning stats (localStorage). Signatures are fixed;
 * implementation is filled in by the lib-core task. See docs/2027-study-overhaul.md §4.
 *
 * Keys:
 *   bigdata-cbt-qstats    Record<questionId, QStat>
 *   bigdata-cbt-cstats    Record<cardId, CStat>
 *   bigdata-cbt-activity  Record<dayKey, DayActivity>
 *   bigdata-cbt-mocks     MockRecord[]
 *   bigdata-cbt-migrated-v2  '1' once legacy data was imported
 *
 * Every read must survive missing/corrupt JSON (return empty), every write must be
 * wrapped in try/catch (quota, private mode), and all functions must be no-ops /
 * empty on the server (typeof window === 'undefined').
 */
import type { Question } from '@/types';
import { addDays, isDayKey, toDayKey, todayKey } from './date';
import { BOX_INTERVALS, MAX_BOX, gradeAnswer, isDue, nextSrs } from './srs';
import type { Grade, SrsState } from './srs';
import { getAllExamAnswers, getHistory, getWrongStats, recordStudyToday } from './storage';

const QSTATS_KEY = 'bigdata-cbt-qstats';
const CSTATS_KEY = 'bigdata-cbt-cstats';
const ACTIVITY_KEY = 'bigdata-cbt-activity';
const MOCKS_KEY = 'bigdata-cbt-mocks';
const MIGRATED_KEY = 'bigdata-cbt-migrated-v2';
/** Stored as JSON → the raw value is the string '1'. */
const MIGRATED = 1;
const MAX_MOCKS = 100;
/** Legacy wrongs that were later answered correctly re-enter the deck as if graded 'good' once. */
const GRADUATED_BOX = 2;

// ---------- storage + validation helpers ----------

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Parsed value, or undefined when missing, corrupt, unreadable or on the server. */
function readJson(key: string): unknown {
  if (!isBrowser()) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded / storage disabled
  }
}

function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch { /* storage disabled */ }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCount(v: unknown): v is number {
  return isNumber(v) && v >= 0;
}

function countOr0(v: unknown): number {
  return isCount(v) ? v : 0;
}

function epochOf(v: unknown): number | undefined {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : undefined;
}

function own<T>(map: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined;
}

function compare<T extends string | number>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Reads a JSON object map, keeping only the entries whose key and value validate. */
function readMap<T>(
  key: string,
  parse: (v: unknown) => T | undefined,
  keyOk: (k: string) => boolean = () => true,
): Record<string, T> {
  const raw = readJson(key);
  if (!isRecord(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([k, v]): Array<[string, T]> => {
      const parsed = keyOk(k) ? parse(v) : undefined;
      return parsed === undefined ? [] : [[k, parsed]];
    }),
  );
}

function toSrs(v: unknown): SrsState | undefined {
  if (!isRecord(v)) return undefined;
  const { box, due } = v;
  return isNumber(box) && Number.isInteger(box) && box >= 1 && box <= MAX_BOX && isDayKey(due)
    ? { box, due }
    : undefined;
}

// ---------- question stats + review deck ----------

export interface QStat {
  /** attempts */
  n: number;
  /** correct attempts */
  c: number;
  /** the very first attempt was correct and not marked unsure */
  first: boolean;
  /** last attempt correct */
  ok: boolean;
  /** last attempt marked 헷갈림 */
  unsure: boolean;
  /** ISO timestamp of last attempt */
  last: string;
  /** present only while the question is in the review deck */
  srs?: SrsState;
}

export interface AnswerEvent {
  id: string;
  correct: boolean;
  unsure?: boolean;
}

function toQStat(v: unknown): QStat | undefined {
  if (!isRecord(v)) return undefined;
  const { n, c, first, ok, unsure, last } = v;
  if (!isCount(n) || !isCount(c)) return undefined;
  const stat: QStat = {
    n,
    c,
    first: first === true,
    ok: ok === true,
    unsure: unsure === true,
    last: typeof last === 'string' ? last : '',
  };
  const srs = toSrs(v.srs);
  return srs ? { ...stat, srs } : stat;
}

function withoutSrs({ n, c, first, ok, unsure, last }: QStat): QStat {
  return { n, c, first, ok, unsure, last };
}

export function getQStats(): Record<string, QStat> {
  return readMap(QSTATS_KEY, toQStat);
}

/** Deck state after one answer graded `grade`; undefined = not in the deck. */
function nextDeckSrs(prev: SrsState | undefined, grade: Grade, today: string): SrsState | undefined {
  if (grade !== 'good') return nextSrs(prev, grade, today); // wrong → again, correct + unsure → hard
  if (!prev) return undefined; // correct and not in the deck: stays out
  return prev.box >= MAX_BOX ? undefined : nextSrs(prev, 'good', today); // graduates past MAX_BOX
}

function applyAnswer(prev: QStat | undefined, e: AnswerEvent, today: string, at: string): QStat {
  const unsure = e.unsure === true;
  const stat: QStat = {
    n: (prev?.n ?? 0) + 1,
    c: (prev?.c ?? 0) + (e.correct ? 1 : 0),
    first: prev ? prev.first : e.correct && !unsure,
    ok: e.correct,
    unsure,
    last: at,
  };
  const srs = nextDeckSrs(prev?.srs, gradeAnswer(e.correct, unsure), today);
  return srs ? { ...stat, srs } : stat;
}

/**
 * Applies one event per question:
 * - wrong            → enters/stays in deck with nextSrs(prev, 'again')
 * - correct + unsure → enters/stays in deck with nextSrs(prev, 'hard')
 * - correct, in deck → nextSrs(prev, 'good'); leaves the deck (srs removed) once box would exceed MAX_BOX
 * - correct, not in deck → stays out of the deck
 * Also adds the batch to today's DayActivity (q, c) and marks today as a study day (streak).
 * Duplicate ids within a batch count once (the last event wins); an empty batch changes nothing.
 */
export function recordAnswers(events: readonly AnswerEvent[], now: Date = new Date()): void {
  if (!isBrowser()) return;
  const latest = Array.from(new Map(events.filter(e => e.id !== '').map(e => [e.id, e])).values());
  if (latest.length === 0) return;
  const today = toDayKey(now);
  const at = now.toISOString();
  const stats = getQStats();
  const updates = Object.fromEntries(
    latest.map(e => [e.id, applyAnswer(own(stats, e.id), e, today, at)]),
  );
  writeJson(QSTATS_KEY, { ...stats, ...updates });
  addActivity({ q: latest.length, c: latest.filter(e => e.correct).length }, now);
}

type DeckEntry = readonly [id: string, srs: SrsState];

function deckEntries(map: Readonly<Record<string, { srs?: SrsState }>>): DeckEntry[] {
  return Object.entries(map).flatMap(([id, s]): DeckEntry[] => (s.srs ? [[id, s.srs]] : []));
}

/** Most overdue (earliest due) first, then lower box, then id. */
function byDue([aId, a]: DeckEntry, [bId, b]: DeckEntry): number {
  return compare(a.due, b.due) || a.box - b.box || compare(aId, bId);
}

function dueIds(map: Readonly<Record<string, { srs?: SrsState }>>, today: string): string[] {
  return deckEntries(map)
    .filter(([, srs]) => isDue(srs, today))
    .sort(byDue)
    .map(([id]) => id);
}

/** Deck questions due on/before `today`, most overdue first, then lower box first, then id. */
export function getDueQuestionIds(today: string = todayKey()): string[] {
  return dueIds(getQStats(), today);
}

/** Every question currently in the deck (any due date), lowest box first (then earliest due, id). Powers 오답노트. */
export function getDeckQuestionIds(): string[] {
  return deckEntries(getQStats())
    .sort(([aId, a], [bId, b]) => a.box - b.box || compare(a.due, b.due) || compare(aId, bId))
    .map(([id]) => id);
}

/**
 * Drops the questions from the deck; their attempt stats are kept. `last` is bumped because it is
 * also the record's sync clock (docs §7.4): an unchanged clock would lose to the server copy.
 */
export function removeFromDeck(ids: readonly string[], now: Date = new Date()): void {
  const stats = getQStats();
  const updates = Object.fromEntries(
    ids.flatMap((id): Array<[string, QStat]> => {
      const s = own(stats, id);
      return s?.srs ? [[id, { ...withoutSrs(s), last: now.toISOString() }]] : [];
    }),
  );
  if (Object.keys(updates).length === 0) return;
  writeJson(QSTATS_KEY, { ...stats, ...updates });
}

export function clearQStats(): void {
  removeKey(QSTATS_KEY);
}

// ---------- concept cards ----------

export interface CStat {
  srs: SrsState;
  /** times graded */
  n: number;
  /** times graded 'again' */
  again: number;
  /** ISO timestamp */
  last: string;
}

function toCStat(v: unknown): CStat | undefined {
  if (!isRecord(v)) return undefined;
  const { n, again, last } = v;
  const srs = toSrs(v.srs);
  return srs && isCount(n) && isCount(again)
    ? { srs, n, again, last: typeof last === 'string' ? last : '' }
    : undefined;
}

export function getCStats(): Record<string, CStat> {
  return readMap(CSTATS_KEY, toCStat);
}

/** Grades a concept card (flashcard or 용어 퀴즈) and adds 1 to today's `cards` activity. */
export function gradeCard(cardId: string, grade: Grade, now: Date = new Date()): void {
  if (!isBrowser() || cardId === '') return;
  const stats = getCStats();
  const prev = own(stats, cardId);
  const next: CStat = {
    srs: nextSrs(prev?.srs, grade, toDayKey(now)),
    n: (prev?.n ?? 0) + 1,
    again: (prev?.again ?? 0) + (grade === 'again' ? 1 : 0),
    last: now.toISOString(),
  };
  writeJson(CSTATS_KEY, { ...stats, [cardId]: next });
  addActivity({ cards: 1 }, now);
}

/** Cards due on/before `today`, most overdue first (then lower box, id). */
export function getDueCardIds(today: string = todayKey()): string[] {
  return dueIds(getCStats(), today);
}

export function clearCStats(): void {
  removeKey(CSTATS_KEY);
}

// ---------- daily activity ----------

export interface DayActivity {
  /** questions answered (bank questions) */
  q: number;
  /** of which correct */
  c: number;
  /** concept cards graded */
  cards: number;
  /** calculation drill items answered */
  drills: number;
}

const NO_ACTIVITY: DayActivity = { q: 0, c: 0, cards: 0, drills: 0 };

function toCounters(v: Readonly<Record<string, unknown>>): DayActivity {
  return { q: countOr0(v.q), c: countOr0(v.c), cards: countOr0(v.cards), drills: countOr0(v.drills) };
}

function toDayActivity(v: unknown): DayActivity | undefined {
  return isRecord(v) ? toCounters(v) : undefined;
}

export function getActivity(): Record<string, DayActivity> {
  return readMap(ACTIVITY_KEY, toDayActivity, isDayKey);
}

/**
 * Adds to today's counters and marks today as a study day (recordStudyToday).
 * Negative / non-numeric counters are ignored; an all-zero delta changes nothing.
 */
export function addActivity(delta: Partial<DayActivity>, now: Date = new Date()): void {
  if (!isBrowser()) return;
  const add = toCounters({ ...delta });
  if (add.q + add.c + add.cards + add.drills === 0) return;
  const day = toDayKey(now);
  const all = getActivity();
  const prev = own(all, day) ?? NO_ACTIVITY;
  const next: DayActivity = {
    q: prev.q + add.q,
    c: prev.c + add.c,
    cards: prev.cards + add.cards,
    drills: prev.drills + add.drills,
  };
  writeJson(ACTIVITY_KEY, { ...all, [day]: next });
  recordStudyToday();
}

// ---------- mock exams ----------

export interface MockRecord {
  /** exam key, e.g. 'mock-123456' | 'session-t1' */
  key: string;
  /** ISO timestamp */
  date: string;
  score: number;
  passed: boolean;
  /** score per subject 1..4 (index 0 = 과목1); -1 when the subject was absent */
  subjectScores: number[];
  total: number;
  correct: number;
  /** seconds */
  timeTaken: number;
  /** 실전 모드 (no explanations during the exam) */
  strict: boolean;
  shuffled: boolean;
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every(isNumber);
}

function toMockRecord(v: unknown): MockRecord | undefined {
  if (!isRecord(v)) return undefined;
  const { key, date, score, passed, subjectScores, total, correct, timeTaken, strict, shuffled } = v;
  if (
    typeof key !== 'string' || key === '' || typeof date !== 'string' || epochOf(date) === undefined
    || !isNumber(score) || !isNumber(total) || !isNumber(correct) || !isNumber(timeTaken)
    || typeof passed !== 'boolean' || typeof strict !== 'boolean' || typeof shuffled !== 'boolean'
    || !isNumberArray(subjectScores)
  ) {
    return undefined;
  }
  return {
    key, date, score, passed, subjectScores: [...subjectScores], total, correct, timeTaken, strict, shuffled,
  };
}

function byDate(a: MockRecord, b: MockRecord): number {
  return Date.parse(a.date) - Date.parse(b.date);
}

/** Valid records in chronological order (oldest first, latest last). */
export function getMockRecords(): MockRecord[] {
  const raw = readJson(MOCKS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((v: unknown): MockRecord[] => {
      const r = toMockRecord(v);
      return r ? [r] : [];
    })
    .sort(byDate);
}

/** Upserts by key+date; keeps at most the latest 100 records. Invalid records are ignored. */
export function saveMockRecord(record: MockRecord): void {
  const clean = toMockRecord(record);
  if (!isBrowser() || !clean) return;
  const others = getMockRecords().filter(r => r.key !== clean.key || r.date !== clean.date);
  writeJson(MOCKS_KEY, [...others, clean].sort(byDate).slice(-MAX_MOCKS));
}

// ---------- one-time legacy migration ----------

interface LegacyAnswer {
  correct: boolean;
  /** epoch ms of the exam's history record, when known */
  at?: number;
}

interface LegacyWrong {
  graduated: boolean;
  at?: number;
}

/** examKey → epoch ms of its legacy history record. */
function legacyExamDates(): Map<string, number> {
  const history: unknown = getHistory();
  if (!Array.isArray(history)) return new Map();
  return new Map(
    history.flatMap((r: unknown): Array<[string, number]> => {
      if (!isRecord(r)) return [];
      const { key, date } = r;
      const at = epochOf(date);
      return typeof key === 'string' && at !== undefined ? [[key, at]] : [];
    }),
  );
}

function examPicks(
  picks: unknown,
  at: number | undefined,
  answerKey: ReadonlyMap<string, number>,
): Array<[string, LegacyAnswer]> {
  if (!isRecord(picks)) return [];
  return Object.entries(picks).flatMap(([id, picked]): Array<[string, LegacyAnswer]> => {
    const answer = answerKey.get(id);
    return answer !== undefined && typeof picked === 'number' ? [[id, { correct: picked === answer, at }]] : [];
  });
}

/** questionId → its answer in the most recent legacy exam record (exams without history count as oldest). */
function legacyAnswers(answerKey: ReadonlyMap<string, number>): Map<string, LegacyAnswer> {
  const byExam: unknown = getAllExamAnswers();
  if (!isRecord(byExam)) return new Map();
  const dates = legacyExamDates();
  const exams = Object.entries(byExam)
    .map(([examKey, picks]) => ({ picks, at: dates.get(examKey) }))
    .sort((a, b) => compare(a.at ?? -Infinity, b.at ?? -Infinity));
  // Map keeps the last value per id, i.e. the most recent exam's answer.
  return new Map(exams.flatMap(({ picks, at }) => examPicks(picks, at, answerKey)));
}

function legacyWrongs(answerKey: ReadonlyMap<string, number>): Map<string, LegacyWrong> {
  const raw: unknown = getWrongStats();
  if (!isRecord(raw)) return new Map();
  return new Map(
    Object.entries(raw).flatMap(([id, w]): Array<[string, LegacyWrong]> =>
      answerKey.has(id) && isRecord(w) && isCount(w.wrongCount) && w.wrongCount > 0
        ? [[id, { graduated: w.graduated === true, at: epochOf(w.lastWrongAt) }]]
        : [],
    ),
  );
}

function legacyQStat(answer: LegacyAnswer | undefined, wrong: LegacyWrong | undefined, today: string, now: Date): QStat {
  const ok = answer ? answer.correct : wrong?.graduated === true;
  const times = [answer?.at, wrong?.at].filter((t): t is number => t !== undefined);
  const stat: QStat = {
    n: 1,
    c: ok ? 1 : 0,
    // A recorded wrong means the first try can't be claimed as correct (keeps 첫 풀이 정답률 honest).
    first: ok && !wrong,
    ok,
    unsure: false,
    last: new Date(times.length > 0 ? Math.max(...times) : now.getTime()).toISOString(),
  };
  if (!wrong) return stat;
  const srs: SrsState = wrong.graduated
    ? { box: GRADUATED_BOX, due: addDays(today, BOX_INTERVALS[GRADUATED_BOX]) }
    : { box: 1, due: today };
  return { ...stat, srs };
}

/**
 * One-time import of legacy data (idempotent via bigdata-cbt-migrated-v2):
 * - bigdata-cbt-answers (examKey → {qid: picked}) → QStat n/c/first/ok using `bank` answer keys
 *   (each question counted once, using its most recent exam record)
 * - bigdata-cbt-wrong-stats → non-graduated wrongs enter the deck due today (box 1);
 *   graduated ones enter box 2 due in 3 days.
 * Existing QStats are never overwritten; ids missing from `bank` are skipped. An empty `bank`
 * (nothing to grade against) or a failed write leaves the flag unset so a later call can retry.
 * Returns true if a migration ran.
 */
export function migrateLegacyStats(bank: readonly Question[], now: Date = new Date()): boolean {
  if (!isBrowser() || bank.length === 0 || readJson(MIGRATED_KEY) === MIGRATED) return false;
  const answerKey = new Map(bank.map(q => [q.id, q.answer]));
  const answers = legacyAnswers(answerKey);
  const wrongs = legacyWrongs(answerKey);
  const existing = getQStats();
  const today = toDayKey(now);
  const ids = Array.from(new Set([...answers.keys(), ...wrongs.keys()]))
    .filter(id => own(existing, id) === undefined);
  const imported = Object.fromEntries(
    ids.map(id => [id, legacyQStat(answers.get(id), wrongs.get(id), today, now)]),
  );
  const saved = ids.length === 0 || writeJson(QSTATS_KEY, { ...existing, ...imported });
  return saved && writeJson(MIGRATED_KEY, MIGRATED);
}
