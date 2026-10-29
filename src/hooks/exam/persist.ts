/** Submit-time writes for a finished run (records, wrong ids, answers, stats, retry context, mock record). */
import type { ExamResult } from '@/types';
import { recordStudyToday, saveExamAnswers, saveRecord, saveRetryContext, saveWrongIds } from '@/lib/storage';
import { recordAnswers, saveMockRecord, type AnswerEvent } from '@/lib/stats';
import { buildRetryContext } from '@/lib/utils';
import { buildMockRecord, shouldSaveMock } from './results';
import type { ExamRun } from './run';

export interface PersistInput {
  run: ExamRun;
  /** original option numbers */
  answers: Readonly<Record<string, number>>;
  result: ExamResult;
  /** answers not yet sent to recordAnswers during the run */
  events: readonly AnswerEvent[];
  now: Date;
}

function attempt(write: () => void): boolean {
  try {
    write();
    return true;
  } catch {
    return false; // reported to the learner through the returned flag
  }
}

/**
 * Every write runs even if an earlier one throws (e.g. storage quota), so a single failure
 * never loses the rest. Returns false when any write failed.
 */
export function persistExamResult({ run, answers, result, events, now }: PersistInput): boolean {
  const questions = run.items.map(item => item.original);
  const wrongIds = questions.filter(q => answers[q.id] !== q.answer).map(q => q.id);
  const writes: ReadonlyArray<() => void> = [
    () => saveRecord({ key: run.examKey, score: result.score, passed: result.passed, date: now.toISOString() }),
    () => saveWrongIds(run.examKey, wrongIds),
    () => saveExamAnswers(run.examKey, { ...answers }),
    () => {
      if (events.length > 0) recordAnswers(events, now);
    },
    () => {
      recordStudyToday();
    },
    () => {
      if (wrongIds.length > 0) saveRetryContext(run.examKey, buildRetryContext(questions, answers, run.retryContext));
    },
    () => {
      if (shouldSaveMock(run)) saveMockRecord(buildMockRecord(run, result, now));
    },
  ];
  return writes.map(attempt).every(Boolean);
}
