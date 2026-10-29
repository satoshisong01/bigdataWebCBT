import { describe, it, expect } from 'vitest';
import type { ExamResult, Question } from '@/types';
import type { ExamItem } from './run';
import {
  examReducer,
  initialExamState,
  isRevealed,
  isUnsureLocked,
  navCellStates,
  pendingAnswerEvents,
  tallyChecked,
  type ExamAction,
  type ExamState,
} from './state';

function question(id: string, answer: number): Question {
  return {
    id,
    session: '제1회',
    sessionId: id.split('-')[0],
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: Number(id.split('-')[1]),
    question: `Q ${id}`,
    options: ['a', 'b', 'c', 'd'],
    answer,
    explanation: '',
  };
}

function item(q: Question): ExamItem {
  return { display: q, original: q, order: [1, 2, 3, 4] };
}

const ITEMS: ExamItem[] = [item(question('5-1', 1)), item(question('5-2', 2)), item(question('5-3', 3))];

const RESULT: ExamResult = {
  totalQuestions: 3,
  correctCount: 1,
  score: 33,
  subjectScores: [],
  passed: false,
  timeTaken: 10,
};

function run(state: ExamState, ...actions: ExamAction[]): ExamState {
  return actions.reduce(examReducer, state);
}

const fresh = (initialAnswers: Record<string, number> = {}) => initialExamState({ items: ITEMS, initialAnswers });

describe('initialExamState', () => {
  it('keeps only restored answers that belong to the run and are valid options', () => {
    const s = fresh({ '5-1': 2, '9-9': 1, '5-2': 7, '5-3': 0 });
    expect(s.answers).toEqual({ '5-1': 2 });
    expect(s.touched.size).toBe(0);
    expect(s.phase).toBe('exam');
    expect(s.total).toBe(3);
  });
});

describe('examReducer', () => {
  it('clamps navigation', () => {
    expect(run(fresh(), { type: 'goto', index: 99 }).index).toBe(2);
    expect(run(fresh(), { type: 'step', delta: -1 }).index).toBe(0);
    expect(run(fresh(), { type: 'step', delta: 1 }, { type: 'step', delta: 1 }).index).toBe(2);
  });

  it('records picks as touched and refuses picks after 확인', () => {
    const s = run(
      fresh(),
      { type: 'pick', id: '5-1', option: 3 },
      { type: 'check', id: '5-1', recorded: true },
      { type: 'pick', id: '5-1', option: 1 },
    );
    expect(s.answers['5-1']).toBe(3);
    expect(s.touched.has('5-1')).toBe(true);
    expect(s.checked.has('5-1')).toBe(true);
    expect(s.recorded.has('5-1')).toBe(true);
  });

  it('ignores 확인 without an answer', () => {
    const s = run(fresh(), { type: 'check', id: '5-1', recorded: true });
    expect(s.checked.size).toBe(0);
    expect(s.recorded.size).toBe(0);
  });

  it('패스 clears the answer, and a later 확인 un-passes the question', () => {
    let s = run(fresh(), { type: 'pick', id: '5-2', option: 1 }, { type: 'pass', id: '5-2', recorded: true });
    expect(s.answers['5-2']).toBeUndefined();
    expect(s.touched.has('5-2')).toBe(false);
    expect(s.passed.has('5-2')).toBe(true);
    s = run(s, { type: 'pick', id: '5-2', option: 2 }, { type: 'check', id: '5-2', recorded: false });
    expect(s.passed.has('5-2')).toBe(false);
    expect(s.checked.has('5-2')).toBe(true);
    expect(s.recorded.has('5-2')).toBe(true); // stays recorded from the pass
  });

  it('marks 헷갈림 when 해설 is opened before answering, and locks it once revealed', () => {
    let s = run(fresh(), { type: 'toggle-explanation', id: '5-1' });
    expect(s.shown.has('5-1')).toBe(true);
    expect(s.unsure.has('5-1')).toBe(true);
    s = run(s, { type: 'toggle-unsure', id: '5-1' });
    expect(s.unsure.has('5-1')).toBe(false); // the learner may undo it
    s = run(s, { type: 'pick', id: '5-1', option: 1 }, { type: 'check', id: '5-1', recorded: true });
    expect(isUnsureLocked(s, '5-1')).toBe(true);
    expect(run(s, { type: 'toggle-unsure', id: '5-1' }).unsure.has('5-1')).toBe(false);
    // closing/reopening 해설 after 확인 never marks 헷갈림
    s = run(s, { type: 'toggle-explanation', id: '5-1' }, { type: 'toggle-explanation', id: '5-1' });
    expect(s.unsure.has('5-1')).toBe(false);
  });

  it('finishes once and moves between result and review', () => {
    let s = run(fresh(), { type: 'finish', result: RESULT, saveFailed: true });
    expect(s.phase).toBe('result');
    expect(s.saveFailed).toBe(true);
    expect(run(s, { type: 'finish', result: { ...RESULT, score: 99 }, saveFailed: false }).result?.score).toBe(33);
    s = run(s, { type: 'goto', index: 2 }, { type: 'review' });
    expect(s.phase).toBe('review');
    expect(s.index).toBe(0);
    expect(run(s, { type: 'show-result' }).phase).toBe('result');
    expect(run(fresh(), { type: 'review' }).phase).toBe('exam');
  });

  it('refuses picks after submit', () => {
    const s = run(fresh(), { type: 'finish', result: RESULT, saveFailed: false }, { type: 'pick', id: '5-1', option: 2 });
    expect(s.answers['5-1']).toBeUndefined();
  });
});

describe('pendingAnswerEvents', () => {
  it('sends each answered or passed question once, by original numbering', () => {
    const s = run(
      fresh({ '5-3': 3 }), // restored, untouched → not an attempt of this run
      { type: 'pick', id: '5-1', option: 1 },
      { type: 'check', id: '5-1', recorded: true }, // already recorded at 확인
      { type: 'pass', id: '5-2', recorded: false }, // recording failed earlier → retried as wrong
    );
    expect(pendingAnswerEvents(s, ITEMS)).toEqual([{ id: '5-2', correct: false, unsure: false }]);
  });

  it('includes touched answers with their 헷갈림 flag', () => {
    const s = run(
      fresh(),
      { type: 'pick', id: '5-1', option: 2 },
      { type: 'pick', id: '5-3', option: 3 },
      { type: 'toggle-unsure', id: '5-3' },
    );
    expect(pendingAnswerEvents(s, ITEMS)).toEqual([
      { id: '5-1', correct: false, unsure: false },
      { id: '5-3', correct: true, unsure: true },
    ]);
  });

  it('records a restored answer that was explicitly checked but not yet recorded', () => {
    const s = run(fresh({ '5-3': 3 }), { type: 'check', id: '5-3', recorded: false });
    expect(pendingAnswerEvents(s, ITEMS)).toEqual([{ id: '5-3', correct: true, unsure: false }]);
  });
});

describe('derived views', () => {
  it('tallies checked answers with passes counted as wrong', () => {
    const s = run(
      fresh(),
      { type: 'pick', id: '5-1', option: 1 },
      { type: 'check', id: '5-1', recorded: true },
      { type: 'pick', id: '5-2', option: 1 },
      { type: 'check', id: '5-2', recorded: true },
      { type: 'pass', id: '5-3', recorded: true },
    );
    expect(tallyChecked(s, ITEMS)).toEqual({ correct: 1, wrong: 2 });
  });

  it('derives nav cell states for exam and review', () => {
    let s = run(
      fresh(),
      { type: 'pick', id: '5-1', option: 1 },
      { type: 'check', id: '5-1', recorded: true },
      { type: 'pass', id: '5-2', recorded: true },
    );
    expect(navCellStates(s, ITEMS)).toEqual({ '5-1': 'correct', '5-2': 'passed', '5-3': 'idle' });
    s = run(s, { type: 'pick', id: '5-3', option: 1 });
    expect(navCellStates(s, ITEMS)['5-3']).toBe('answered');
    s = run(s, { type: 'finish', result: RESULT, saveFailed: false }, { type: 'review' });
    expect(navCellStates(s, ITEMS)).toEqual({ '5-1': 'correct', '5-2': 'skipped', '5-3': 'wrong' });
  });

  it('never reveals during 실전 모드 until review', () => {
    let s = run(fresh(), { type: 'toggle-explanation', id: '5-1' });
    expect(isRevealed(s, '5-1', false)).toBe(true);
    expect(isRevealed(s, '5-1', true)).toBe(false);
    s = run(s, { type: 'finish', result: RESULT, saveFailed: false }, { type: 'review' });
    expect(isRevealed(s, '5-2', true)).toBe(true);
  });
});
