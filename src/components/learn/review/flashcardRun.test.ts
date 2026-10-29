import { describe, it, expect } from 'vitest';
import { START_FLASH, flipCard, gradeCurrent, gradeHints, gradeTally } from './flashcardRun';

describe('flashcard run', () => {
  it('grades only after the flip, then shows the next front', () => {
    expect(gradeCurrent(START_FLASH, 'good', 2)).toBe(START_FLASH);
    const flipped = flipCard(START_FLASH);
    expect(flipped).toEqual({ index: 0, flipped: true, grades: [] });
    expect(flipCard(flipped)).toBe(flipped);
    const next = gradeCurrent(flipped, 'again', 2);
    expect(next).toEqual({ index: 1, flipped: false, grades: ['again'] });
    expect(START_FLASH).toEqual({ index: 0, flipped: false, grades: [] });
  });

  it('ignores grades past the end', () => {
    const end = { index: 1, flipped: true, grades: ['good' as const] };
    expect(gradeCurrent(end, 'easy', 1)).toBe(end);
  });

  it('tallies grades', () => {
    expect(gradeTally(['again', 'good', 'good'])).toEqual({ again: 1, hard: 0, good: 2, easy: 0 });
    expect(gradeTally([])).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
  });
});

describe('gradeHints', () => {
  it('shows the next interval for a new card', () => {
    expect(gradeHints(undefined, '2026-10-29')).toEqual({ again: '1일', hard: '1일', good: '3일', easy: '14일' });
  });

  it('caps at the last box', () => {
    expect(gradeHints({ box: 5, due: '2026-10-29' }, '2026-10-29')).toEqual({
      again: '1일',
      hard: '30일',
      good: '60일',
      easy: '60일',
    });
  });
});
