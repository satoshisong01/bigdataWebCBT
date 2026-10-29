/**
 * CONTRACT — pure question-set composition (no storage access here).
 * Composed sets (mock / weak / topic) are COPIES labelled with each question's 2027 출제기준 subject
 * (criteriaSubjectOf: the subject of topics[0]), so the exam screen groups and scores them by the
 * 2027 layout even where the exam paper put the question under another 과목. The bank is never mutated.
 */
import type { Question, QuestionSource } from '@/types';
import { getSession } from '@/data/catalog';
import { CRITERIA, SUBS, criteriaSubjectOf, topicMatches } from '@/data/criteria';
import { seededRandom, shuffleWith } from './rng';
import type { Rand } from './rng';
import type { QStat } from './stats';
import type { TopicStat } from './mastery';

export interface ShuffledQuestion {
  /** options reordered; `answer` and `optionNotes` remapped to the new order */
  question: Question;
  /** order[displayIndex] = original 1-based option number */
  order: number[];
}

/** Identity order when q.noShuffle is set or there is only one option. Never mutates `q`. */
export function shuffleQuestionOptions(q: Question, rand: Rand): ShuffledQuestion {
  const identity = q.options.map((_, i) => i + 1);
  const order = q.noShuffle || identity.length < 2 ? identity : shuffleWith(identity, rand);
  const answerAt = order.indexOf(q.answer);
  const notes = q.optionNotes;
  const question: Question = {
    ...q,
    options: order.map(o => q.options[o - 1]),
    answer: answerAt >= 0 ? answerAt + 1 : q.answer,
    // A note always travels with its option; a missing note becomes ''.
    ...(notes ? { optionNotes: order.map(o => notes[o - 1] ?? '') } : {}),
  };
  return { question, order };
}

/** Translates a picked display option back to the original 1-based option number. */
export function toOriginalOption(order: readonly number[], displayPick: number): number {
  return order[displayPick - 1] ?? displayPick;
}

export interface MockOptions {
  /** default 20 */
  perSubject?: number;
  /** default: all sources */
  sources?: readonly QuestionSource[];
}

const DEFAULT_PER_SUBJECT = 20;
const DEFAULT_WEAK_SIZE = 20;
const UNTAGGED = 'untagged';
/** Group order for mock composition: 세부항목 in criteria order, untagged questions last. */
const GROUP_KEYS: readonly string[] = [...SUBS.map(u => u.id), UNTAGGED];
const SUB_IDS: ReadonlySet<string> = new Set(SUBS.map(u => u.id));
const SUBJECT_NAMES: ReadonlyMap<number, string> = new Map(CRITERIA.map(s => [s.id, s.name]));

/** A copy of `q` whose subject/subjectName are its 2027 출제기준 subject (criteriaSubjectOf, name from CRITERIA). */
export function withCriteriaSubject(q: Question): Question {
  const subject = criteriaSubjectOf(q);
  return { ...q, subject, subjectName: SUBJECT_NAMES.get(subject) ?? q.subjectName };
}

type Tier = 'fresh' | 'missed' | 'rest';

const MOCK_TIERS: readonly Tier[] = ['fresh', 'missed', 'rest'];
const WEAK_TIERS: readonly Tier[] = ['missed', 'fresh', 'rest'];

/** fresh: never attempted · missed: last attempt wrong or marked 헷갈림 · rest: last attempt confidently correct */
function tierOf(stat: QStat | undefined): Tier {
  if (!stat || !(stat.n > 0)) return 'fresh';
  return !stat.ok || stat.unsure ? 'missed' : 'rest';
}

/** Tiers in the given priority; each tier seeded-shuffled. */
function byTier(
  questions: readonly Question[],
  qstats: Readonly<Record<string, QStat>>,
  tiers: readonly Tier[],
  rand: Rand,
): Question[] {
  return tiers.flatMap(tier => shuffleWith(questions.filter(q => tierOf(qstats[q.id]) === tier), rand));
}

function uniqueById(bank: readonly Question[]): Question[] {
  const seen = new Set<string>();
  return bank.filter(q => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

function hasTopic(q: Question, prefix: string): boolean {
  return (q.topics ?? []).some(t => topicMatches(t, prefix));
}

/** 세부항목 of the most relevant tag that maps into the criteria, else UNTAGGED. */
function groupKeyOf(q: Question): string {
  const sub = (q.topics ?? []).map(t => t.split('.').slice(0, 3).join('.')).find(id => SUB_IDS.has(id));
  return sub ?? UNTAGGED;
}

/** Non-empty groups in GROUP_KEYS order; each keeps bank order. */
function groupBySub(questions: readonly Question[]): Question[][] {
  const keys = questions.map(groupKeyOf);
  return GROUP_KEYS
    .map(key => questions.filter((_, i) => keys[i] === key))
    .filter(group => group.length > 0);
}

/**
 * Largest-remainder (Hamilton) apportionment of `seats` over groups of the given sizes (sum must exceed seats).
 * Equal remainders go to the larger group, then to a seeded coin flip so repeated mocks rotate small groups.
 */
function apportion(sizes: readonly number[], seats: number, rand: Rand): number[] {
  const total = sizes.reduce((sum, s) => sum + s, 0);
  const base = sizes.map(s => Math.floor((s * seats) / total));
  const remainder = sizes.map(s => (s * seats) % total);
  const jitter = sizes.map(() => rand());
  const left = seats - base.reduce((sum, b) => sum + b, 0);
  const winners = new Set(
    sizes
      .map((_, i) => i)
      .sort((a, b) => remainder[b] - remainder[a] || sizes[b] - sizes[a] || jitter[a] - jitter[b])
      .slice(0, left),
  );
  return base.map((b, i) => (winners.has(i) ? b + 1 : b));
}

function filterBySource(bank: readonly Question[], sources: readonly QuestionSource[] | undefined): readonly Question[] {
  if (!sources) return bank;
  const allowed = new Set(sources);
  return bank.filter(q => {
    const source = getSession(q.sessionId)?.source;
    return source !== undefined && allowed.has(source);
  });
}

/**
 * Deterministic for (bank, qstats, seed). For each 2027 subject 1..4 (criteriaSubjectOf) picks `perSubject`
 * questions: spread across 세부항목 roughly in proportion to how many bank questions each has,
 * preferring never-attempted, then last-wrong/unsure, then the rest; no duplicate ids.
 * Result is ordered by subject; within a subject the order is shuffled. Returns withCriteriaSubject copies.
 */
export function composeMockExam(
  bank: readonly Question[],
  qstats: Readonly<Record<string, QStat>>,
  seed: number,
  options?: MockOptions,
): Question[] {
  const perSubject = Math.floor(options?.perSubject ?? DEFAULT_PER_SUBJECT);
  if (!(perSubject > 0)) return [];
  const pool = filterBySource(uniqueById(bank), options?.sources).map(withCriteriaSubject);
  const rand = seededRandom(seed);
  return CRITERIA.flatMap(({ id }) => {
    const subjectPool = pool.filter(q => q.subject === id);
    if (subjectPool.length <= perSubject) return shuffleWith(subjectPool, rand);
    // Untagged questions form one group, so an untagged (or partly tagged) bank still composes.
    const groups = groupBySub(subjectPool);
    const seats = apportion(groups.map(g => g.length), perSubject, rand);
    const picked = groups.flatMap((group, i) => byTier(group, qstats, MOCK_TIERS, rand).slice(0, seats[i]));
    return shuffleWith(picked, rand);
  });
}

/**
 * Up to `size` questions from the weakest 세세항목 (`weak`, already ranked), round-robin across topics,
 * preferring last-wrong/unsure, then never-attempted, then the rest. Deterministic for `seed`.
 * Returns withCriteriaSubject copies.
 */
export function composeWeakSet(
  bank: readonly Question[],
  qstats: Readonly<Record<string, QStat>>,
  weak: readonly TopicStat[],
  seed: number,
  size?: number,
): Question[] {
  const limit = Math.floor(size ?? DEFAULT_WEAK_SIZE);
  if (weak.length === 0 || !(limit > 0)) return [];
  const pool = uniqueById(bank);
  const rand = seededRandom(seed);
  const queues = weak.map(w => byTier(pool.filter(q => hasTopic(q, w.topic)), qstats, WEAK_TIERS, rand));
  return roundRobin(queues, limit).map(withCriteriaSubject);
}

/** One question per queue per round (skipping ids already taken) until `limit` or every queue is exhausted. */
function roundRobin(queues: readonly (readonly Question[])[], limit: number): Question[] {
  const picked: Question[] = [];
  const taken = new Set<string>();
  const cursors = queues.map(() => 0);
  let progressed = true;
  while (progressed && picked.length < limit) {
    progressed = false;
    for (let i = 0; i < queues.length && picked.length < limit; i++) {
      const queue = queues[i];
      while (cursors[i] < queue.length && taken.has(queue[cursors[i]].id)) cursors[i] += 1;
      if (cursors[i] < queue.length) {
        const q = queue[cursors[i]];
        cursors[i] += 1;
        taken.add(q.id);
        picked.push(q);
        progressed = true;
      }
    }
  }
  return picked;
}

/**
 * Questions having any topic equal to or under `topicPrefix` ('3.1' matches '3.1.1.4'; '3.1.1' must not match '3.1.10.1').
 * Bank order; returns withCriteriaSubject copies.
 */
export function questionsForTopic(bank: readonly Question[], topicPrefix: string): Question[] {
  return bank.filter(q => hasTopic(q, topicPrefix)).map(withCriteriaSubject);
}
