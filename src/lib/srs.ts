import { addDays } from './date';

/**
 * Leitner-style spaced repetition shared by questions and concept cards.
 * box 0 = not scheduled; boxes 1..MAX_BOX are reviewed after BOX_INTERVALS[box] days.
 */
export const BOX_INTERVALS: readonly number[] = [0, 1, 3, 7, 14, 30, 60];
export const MAX_BOX = 6;

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  box: number;
  /** day key (yyyy-mm-dd) */
  due: string;
}

/**
 * - again → box 1
 * - hard  → keep box (at least 1)
 * - good  → box + 1 (a never-scheduled item lands in box 2)
 * - easy  → box + 2 (a never-scheduled item lands in box 4)
 * Capped at MAX_BOX; due = today + BOX_INTERVALS[newBox].
 */
export function nextSrs(prev: SrsState | undefined, grade: Grade, today: string): SrsState {
  const box = prev && prev.box > 0 ? prev.box : 0;
  let next: number;
  switch (grade) {
    case 'again':
      next = 1;
      break;
    case 'hard':
      next = Math.max(1, box);
      break;
    case 'good':
      next = box === 0 ? 2 : box + 1;
      break;
    case 'easy':
      next = box === 0 ? 4 : box + 2;
      break;
  }
  next = Math.min(MAX_BOX, next);
  return { box: next, due: addDays(today, BOX_INTERVALS[next]) };
}

export function isDue(s: SrsState | undefined, today: string): boolean {
  return !!s && s.box > 0 && s.due <= today;
}

/** Question answers map onto grades: wrong → again, correct-but-unsure → hard, correct → good. */
export function gradeAnswer(correct: boolean, unsure: boolean): Grade {
  if (!correct) return 'again';
  return unsure ? 'hard' : 'good';
}
