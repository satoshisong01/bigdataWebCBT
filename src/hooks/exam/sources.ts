/**
 * Resolves an /exam source into a ready run: lazy bank loaders + the learner's stats.
 * Client-only (reads localStorage through storage/stats/settings).
 */
import type { Question } from '@/types';
import { loadAllQuestions, loadQuestionsByIds, loadSession } from '@/data/bank';
import { getSession } from '@/data/catalog';
import { isTopicId, topicName } from '@/data/criteria';
import { SUBJECTS } from '@/data/subjects';
import { getBookmarks, getExamAnswers, getRetryContext, getWrongIds } from '@/lib/storage';
import { getDeckQuestionIds, getDueQuestionIds, getQStats } from '@/lib/stats';
import { leafStats, weakestTopics, type TopicStat } from '@/lib/mastery';
import { composeMockExam, composeWeakSet, questionsForTopic } from '@/lib/compose';
import { getSettings } from '@/lib/settings';
import { hashSeed, newSeed, seededRandom, shuffleWith, type Rand } from '@/lib/rng';
import { examKeyOf, type ExamParams, type ExamSource, type ExamSourceKind } from './params';
import { createRun, type ExamRun } from './run';

export type EmptyReason = ExamSourceKind | 'topic-invalid';

export type ExamLoadOutcome = { kind: 'ready'; run: ExamRun } | { kind: 'empty'; reason: EmptyReason };

interface QuestionSet {
  questions: Question[];
  title: string;
}

const NO_SET: QuestionSet = { questions: [], title: '' };

export const WEAK_TOPIC_COUNT = 8;
export const WEAK_MIN_ATTEMPTED = 2;

/**
 * Restoring the last saved answers only makes sense for fixed sets you come back to
 * (회차/과목/전체). Pools, retries of wrong answers and 실전 모드 always start blank.
 */
const PREFILL_KINDS: ReadonlySet<ExamSourceKind> = new Set<ExamSourceKind>(['session', 'subject', 'all']);

export async function loadExam(params: ExamParams): Promise<ExamLoadOutcome> {
  const { source, strict } = params;
  if (source.kind === 'topic' && !isTopicId(source.topic)) return { kind: 'empty', reason: 'topic-invalid' };
  const set = await loadQuestionSet(source, strict);
  if (set.questions.length === 0) return { kind: 'empty', reason: source.kind };
  const examKey = examKeyOf(source);
  const run = createRun({
    examKey,
    title: set.title,
    strict,
    shuffleSetting: getSettings().shuffleOptions,
    questions: set.questions,
    initialAnswers: !strict && PREFILL_KINDS.has(source.kind) ? getExamAnswers(examKey) ?? {} : {},
    retryContext: source.kind === 'wrong' ? getRetryContext(source.examKey) ?? null : null,
    seed: source.kind === 'weak' || source.kind === 'mock' ? requireSeed(source.seed) : newSeed(),
  });
  return { kind: 'ready', run };
}

function requireSeed(seed: number | null): number {
  if (seed === null) throw new Error('seeded exam requested without a seed');
  return seed;
}

function unique(ids: readonly string[]): string[] {
  return Array.from(new Set(ids));
}

async function loadQuestionSet(source: ExamSource, strict: boolean): Promise<QuestionSet> {
  switch (source.kind) {
    case 'session': {
      const session = getSession(source.sessionId);
      return session ? { questions: await loadSession(session.id), title: session.name } : NO_SET;
    }
    case 'subject':
      return loadSubjectSet(source.subject, source.sessionId);
    case 'wrong': {
      const questions = await loadQuestionsByIds(unique(getWrongIds(source.examKey)));
      return { questions, title: wrongRetryTitle(source.examKey, questions[0]) };
    }
    case 'bookmarks':
      return { questions: await loadQuestionsByIds(unique(getBookmarks())), title: '북마크 모음' };
    case 'wrong-pool':
      return { questions: await loadQuestionsByIds(unique(getDeckQuestionIds())), title: '오답노트' };
    case 'review':
      return { questions: await loadQuestionsByIds(unique(getDueQuestionIds())), title: '오늘의 복습' };
    case 'weak': {
      const seed = requireSeed(source.seed);
      const bank = await loadAllQuestions();
      const qstats = getQStats();
      const topics = pickWeakTopics(leafStats(bank, qstats), seededRandom(hashSeed(`weak-topics:${seed}`)));
      return { questions: composeWeakSet(bank, qstats, topics, seed), title: '약점 집중' };
    }
    case 'topic':
      return { questions: questionsForTopic(await loadAllQuestions(), source.topic), title: topicName(source.topic) };
    case 'mock': {
      const seed = requireSeed(source.seed);
      const bank = await loadAllQuestions();
      return { questions: composeMockExam(bank, getQStats(), seed), title: strict ? '실전 모의고사' : '랜덤 모의고사' };
    }
    case 'all':
      return { questions: await loadAllQuestions(), title: '전체 문제' };
  }
}

async function loadSubjectSet(subject: number, sessionId: string | null): Promise<QuestionSet> {
  const meta = SUBJECTS.find(s => s.id === subject);
  if (!meta) return NO_SET;
  if (!sessionId) {
    const all = await loadAllQuestions();
    return { questions: all.filter(q => q.subject === subject), title: `${meta.name} - 전체` };
  }
  const session = getSession(sessionId);
  if (!session) return NO_SET;
  const questions = (await loadSession(session.id)).filter(q => q.subject === subject);
  return { questions, title: `${meta.name} - ${session.name}` };
}

function wrongRetryTitle(examKey: string, first: Question | undefined): string {
  const base = '오답 다시풀기';
  if (!first || !(examKey.startsWith('session-') || examKey.startsWith('subject-'))) return base;
  return `${base} - ${getSession(first.sessionId)?.name ?? first.session}`;
}

/**
 * Weakest 세세항목 (≥ WEAK_MIN_ATTEMPTED attempts). Before there is enough history,
 * falls back to the least-practised leaves so the set still targets unexplored ground.
 */
export function pickWeakTopics(stats: ReadonlyMap<string, TopicStat>, rand: Rand): TopicStat[] {
  const weak = weakestTopics(stats, WEAK_TOPIC_COUNT, WEAK_MIN_ATTEMPTED);
  return weak.length > 0 ? weak : fewestAttemptedLeaves(stats, WEAK_TOPIC_COUNT, rand);
}

/** Leaves that have questions, fewest attempts first; ties broken by `rand` so subject 1 does not always win. */
export function fewestAttemptedLeaves(stats: ReadonlyMap<string, TopicStat>, n: number, rand: Rand): TopicStat[] {
  return shuffleWith([...stats.values()].filter(s => s.questions > 0), rand)
    .sort((a, b) => a.attempted - b.attempted)
    .slice(0, n);
}
