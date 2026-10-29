import { describe, it, expect } from 'vitest';
import type { Question } from '@/types';
import { toOriginalOption } from '@/lib/compose';
import { buildItems, toDisplayOption } from './run';

// Uses the real compose.ts: the exam UI's display↔original mapping must agree with it.
const Q: Question = {
  id: '7-12',
  session: '제7회',
  sessionId: '7',
  subject: 1,
  subjectName: '빅데이터 분석 기획',
  number: 12,
  question: 'q',
  options: ['가', '나', '다', '라'],
  answer: 3,
  explanation: '',
  optionNotes: ['n가', 'n나', 'n다', 'n라'],
};

describe('display ↔ original option mapping (real compose.ts)', () => {
  it('round-trips every display position for many seeds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [item] = buildItems([Q], true, seed);
      const { display, original, order } = item;
      expect(original).toBe(Q);
      for (let d = 1; d <= display.options.length; d++) {
        const o = toOriginalOption(order, d);
        expect(display.options[d - 1]).toBe(original.options[o - 1]);
        expect(display.optionNotes?.[d - 1]).toBe(original.optionNotes?.[o - 1]);
        expect(toDisplayOption(order, o)).toBe(d);
      }
      expect(display.options[display.answer - 1]).toBe(original.options[original.answer - 1]);
      expect(toOriginalOption(order, display.answer)).toBe(original.answer);
    }
  });

  it('is reproducible per seed and keeps noShuffle questions in place', () => {
    expect(buildItems([Q], true, 7)[0].order).toEqual(buildItems([Q], true, 7)[0].order);
    expect(buildItems([{ ...Q, noShuffle: true }], true, 7)[0].order).toEqual([1, 2, 3, 4]);
  });
});
