/**
 * One attempt at a question set. Options may be shown in a shuffled order, but every
 * stored/graded answer uses the ORIGINAL option number (see toOriginalOption in compose.ts).
 */
import type { Question } from '@/types';
import type { RetryContext } from '@/lib/storage';
import { shuffleQuestionOptions } from '@/lib/compose';
import { hashSeed, seededRandom } from '@/lib/rng';
import { timeLimitFor } from './params';

export interface ExamItem {
  /** what the learner sees: options possibly reordered, `answer`/`optionNotes` remapped */
  display: Question;
  /** the bank question — grading and storage always use it */
  original: Question;
  /** order[displayIndex] = original 1-based option number */
  order: number[];
}

export interface ExamRun {
  examKey: string;
  title: string;
  strict: boolean;
  /** options were shuffled for this run (noShuffle questions keep their order) */
  shuffled: boolean;
  items: ExamItem[];
  /** restored picks, original numbering */
  initialAnswers: Readonly<Record<string, number>>;
  retryContext: RetryContext | null;
  /** seconds */
  timeLimit: number;
}

export function identityOrder(q: Question): number[] {
  return q.options.map((_, i) => i + 1);
}

/** Each question gets its own seeded stream, so its option order does not depend on the set order. */
export function buildItems(questions: readonly Question[], shuffle: boolean, seed: number): ExamItem[] {
  return questions.map(q => {
    if (!shuffle) return { display: q, original: q, order: identityOrder(q) };
    const { question, order } = shuffleQuestionOptions(q, seededRandom(hashSeed(`${seed}:${q.id}`)));
    return { display: question, original: q, order };
  });
}

export interface RunInput {
  examKey: string;
  title: string;
  strict: boolean;
  /** settings.shuffleOptions (실전 모드 always shuffles) */
  shuffleSetting: boolean;
  questions: readonly Question[];
  initialAnswers: Readonly<Record<string, number>>;
  retryContext: RetryContext | null;
  seed: number;
}

export function createRun(input: RunInput): ExamRun {
  const shuffled = input.strict || input.shuffleSetting;
  return {
    examKey: input.examKey,
    title: input.title,
    strict: input.strict,
    shuffled,
    items: buildItems(input.questions, shuffled, input.seed),
    initialAnswers: input.initialAnswers,
    retryContext: input.retryContext,
    timeLimit: timeLimitFor(input.strict, input.questions.length),
  };
}

/** A fresh attempt within the same exam (다시 풀기 / 틀린 문제만 다시 풀기), reshuffled with `seed`. */
export function restartRun(
  run: ExamRun,
  questions: readonly Question[],
  retryContext: RetryContext | null,
  seed: number,
): ExamRun {
  return {
    ...run,
    items: buildItems(questions, run.shuffled, seed),
    initialAnswers: {},
    retryContext,
    timeLimit: timeLimitFor(run.strict, questions.length),
  };
}

/** Inverse of toOriginalOption: where the original option `original` is shown (1-based). */
export function toDisplayOption(order: readonly number[], original: number | undefined): number | undefined {
  if (original === undefined) return undefined;
  const i = order.indexOf(original);
  return i >= 0 ? i + 1 : undefined;
}
