/** Pure result analysis for a finished run. */
import type { ExamResult, Question } from '@/types';
import type { MockRecord } from '@/lib/stats';
import { topicName } from '@/data/criteria';
import type { ExamRun } from './run';

export interface WrongTopic {
  /** 세세항목 id */
  topic: string;
  name: string;
  /** wrong (or unanswered) questions tagged with it */
  count: number;
}

export const WRONG_TOPIC_LIMIT = 5;

/** Most-missed 세세항목 of this run; a question tagged with several topics counts toward each. */
export function wrongTopicCounts(
  questions: readonly Question[],
  answers: Readonly<Record<string, number>>,
  limit: number = WRONG_TOPIC_LIMIT,
): WrongTopic[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (answers[q.id] === q.answer) continue;
    for (const topic of new Set(q.topics ?? [])) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, name: topicName(topic), count }));
}

/** MockRecord.subjectScores: index 0 = 과목1 … index 3 = 과목4; -1 when the subject was absent. */
export function subjectScoreArray(result: ExamResult): number[] {
  return [1, 2, 3, 4].map(subject => result.subjectScores.find(s => s.subject === subject)?.score ?? -1);
}

/** A run of at least this many questions counts as a mock even in 학습 모드. */
export const MOCK_MIN_QUESTIONS = 40;

/**
 * 실전 runs and long runs feed 합격 준비도. Retries of wrong answers never do:
 * their score re-uses the earlier correct answers (RetryContext), so it overstates skill.
 */
export function shouldSaveMock(run: Pick<ExamRun, 'strict' | 'items' | 'retryContext'>): boolean {
  return run.retryContext === null && (run.strict || run.items.length >= MOCK_MIN_QUESTIONS);
}

export function buildMockRecord(run: ExamRun, result: ExamResult, now: Date): MockRecord {
  return {
    key: run.examKey,
    date: now.toISOString(),
    score: result.score,
    passed: result.passed,
    subjectScores: subjectScoreArray(result),
    total: result.totalQuestions,
    correct: result.correctCount,
    timeTaken: result.timeTaken,
    strict: run.strict,
    shuffled: run.shuffled,
  };
}
