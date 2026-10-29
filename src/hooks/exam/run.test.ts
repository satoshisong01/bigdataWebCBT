import { describe, it, expect, vi } from 'vitest';
import type { Question } from '@/types';

// compose.ts is implemented by another task; a reversing stand-in is enough to verify the wiring.
vi.mock('@/lib/compose', () => ({
  shuffleQuestionOptions: (q: Question) => {
    if (q.noShuffle) return { question: q, order: q.options.map((_, i) => i + 1) };
    const order = q.options.map((_, i) => q.options.length - i);
    return {
      question: {
        ...q,
        options: order.map(o => q.options[o - 1]),
        answer: order.indexOf(q.answer) + 1,
        optionNotes: q.optionNotes ? order.map(o => q.optionNotes![o - 1]) : undefined,
      },
      order,
    };
  },
}));

import { buildItems, createRun, restartRun, toDisplayOption } from './run';

function question(id: string, answer: number, extra: Partial<Question> = {}): Question {
  return {
    id,
    session: '제2회',
    sessionId: '2',
    subject: 2,
    subjectName: '빅데이터 탐색',
    number: 1,
    question: 'q',
    options: ['A', 'B', 'C', 'D'],
    answer,
    explanation: '',
    optionNotes: ['na', 'nb', 'nc', 'nd'],
    ...extra,
  };
}

describe('buildItems', () => {
  it('keeps the identity order when not shuffling', () => {
    const [it0] = buildItems([question('2-1', 3)], false, 1);
    expect(it0.order).toEqual([1, 2, 3, 4]);
    expect(it0.display).toBe(it0.original);
  });

  it('shows the shuffled question but keeps the original for grading', () => {
    const q = question('2-1', 3);
    const [it0] = buildItems([q], true, 1);
    expect(it0.original).toBe(q);
    expect(it0.order).toEqual([4, 3, 2, 1]);
    expect(it0.display.options).toEqual(['D', 'C', 'B', 'A']);
    expect(it0.display.answer).toBe(2);
    expect(it0.display.optionNotes).toEqual(['nd', 'nc', 'nb', 'na']);
    expect(q.options).toEqual(['A', 'B', 'C', 'D']); // never mutated
  });

  it('respects noShuffle', () => {
    const [it0] = buildItems([question('2-1', 3, { noShuffle: true })], true, 1);
    expect(it0.order).toEqual([1, 2, 3, 4]);
  });
});

describe('toDisplayOption', () => {
  it('inverts the order', () => {
    expect(toDisplayOption([4, 3, 2, 1], 4)).toBe(1);
    expect(toDisplayOption([2, 1, 3, 4], 1)).toBe(2);
    expect(toDisplayOption([1, 2, 3, 4], undefined)).toBeUndefined();
    expect(toDisplayOption([1, 2, 3, 4], 9)).toBeUndefined();
  });
});

describe('createRun / restartRun', () => {
  const base = {
    examKey: 'session-2',
    title: '제2회',
    questions: [question('2-1', 1), question('2-2', 2)],
    initialAnswers: { '2-1': 1 },
    retryContext: null,
    seed: 5,
  };

  it('always shuffles in 실전 모드 and follows the setting otherwise', () => {
    expect(createRun({ ...base, strict: true, shuffleSetting: false }).shuffled).toBe(true);
    expect(createRun({ ...base, strict: false, shuffleSetting: false }).shuffled).toBe(false);
    expect(createRun({ ...base, strict: false, shuffleSetting: true }).shuffled).toBe(true);
  });

  it('derives the time limit from the mode and size', () => {
    expect(createRun({ ...base, strict: true, shuffleSetting: true }).timeLimit).toBe(180);
    expect(createRun({ ...base, strict: false, shuffleSetting: true }).timeLimit).toBe(7200);
  });

  it('restarts with blank answers, the given retry context and a new limit', () => {
    const run = createRun({ ...base, strict: true, shuffleSetting: true });
    const ctx = { totals: { 2: 2 }, baseCorrect: { 2: 1 } };
    const next = restartRun(run, [question('2-2', 2)], ctx, 9);
    expect(next.items.map(i => i.original.id)).toEqual(['2-2']);
    expect(next.initialAnswers).toEqual({});
    expect(next.retryContext).toBe(ctx);
    expect(next.timeLimit).toBe(90);
    expect(next.examKey).toBe('session-2');
    expect(next.strict).toBe(true);
  });
});
