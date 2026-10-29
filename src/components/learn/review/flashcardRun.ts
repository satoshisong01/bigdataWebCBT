/** Flashcard session state for /review (pure). */
import { nextSrs, type Grade, type SrsState } from '@/lib/srs';
import { diffDays } from '@/lib/date';

export const FLASH_GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

export interface FlashRun {
  index: number;
  /** back side (summary/points) visible */
  flipped: boolean;
  /** grade given to each reviewed card, in order */
  grades: readonly Grade[];
}

export const START_FLASH: FlashRun = { index: 0, flipped: false, grades: [] };

export function flipCard(run: FlashRun): FlashRun {
  return run.flipped ? run : { ...run, flipped: true };
}

/** Grades the current card once its back was shown, then moves to the next front. */
export function gradeCurrent(run: FlashRun, grade: Grade, total: number): FlashRun {
  if (!run.flipped || run.index >= total) return run;
  return { index: run.index + 1, flipped: false, grades: [...run.grades, grade] };
}

export function gradeTally(grades: readonly Grade[]): Record<Grade, number> {
  return grades.reduce<Record<Grade, number>>(
    (acc, g) => ({ ...acc, [g]: acc[g] + 1 }),
    { again: 0, hard: 0, good: 0, easy: 0 },
  );
}

/** Next review interval per grade (e.g. { good: '3일' }), computed with the shared SRS rule. */
export function gradeHints(prev: SrsState | undefined, today: string): Record<Grade, string> {
  const hint = (g: Grade) => `${diffDays(today, nextSrs(prev, g, today).due)}일`;
  return { again: hint('again'), hard: hint('hard'), good: hint('good'), easy: hint('easy') };
}
