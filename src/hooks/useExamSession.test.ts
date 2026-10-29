import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Question } from '@/types';

vi.mock('@/lib/stats', () => ({
  recordAnswers: vi.fn(),
  saveMockRecord: vi.fn(),
}));
vi.mock('@/lib/compose', () => ({
  toOriginalOption: (order: readonly number[], displayPick: number) => order[displayPick - 1],
  shuffleQuestionOptions: (q: Question) => ({ question: q, order: q.options.map((_, i) => i + 1) }),
}));

import * as stats from '@/lib/stats';
import { getExamAnswers, getHistory } from '@/lib/storage';
import { useExamSession, type ExamSession } from './useExamSession';
import type { ExamItem, ExamRun } from './exam/run';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function question(id: string, subject: number, answer: number): Question {
  return {
    id,
    session: '제6회',
    sessionId: '6',
    subject,
    subjectName: `과목${subject}`,
    number: 1,
    question: 'q',
    options: ['A', 'B', 'C', 'D'],
    answer,
    explanation: '',
  };
}

/** Options shown reversed: display 1 = original 4 … display 4 = original 1. */
function reversed(q: Question): ExamItem {
  const order = [4, 3, 2, 1];
  return { display: { ...q, options: order.map(o => q.options[o - 1]), answer: order.indexOf(q.answer) + 1 }, original: q, order };
}

const Q1 = question('6-1', 1, 4); // correct = display 1
const Q2 = question('6-2', 2, 1); // correct = display 4
const Q3 = question('6-3', 3, 2); // correct = display 3

function makeRun(strict: boolean, timeLimit = 7200): ExamRun {
  return {
    examKey: 'session-6',
    title: '제6회',
    strict,
    shuffled: true,
    items: [Q1, Q2, Q3].map(reversed),
    initialAnswers: {},
    retryContext: null,
    timeLimit,
  };
}

const probe: { session: ExamSession | null } = { session: null };
let root: Root;
const onRestart = vi.fn();

function Harness({ run }: { run: ExamRun }) {
  const session = useExamSession(run, onRestart);
  useEffect(() => {
    probe.session = session;
  });
  return null;
}

/** The hook's API after the last committed render. */
function api(): ExamSession {
  if (!probe.session) throw new Error('not rendered');
  return probe.session;
}

function mount(run: ExamRun) {
  root = createRoot(document.createElement('div'));
  act(() => root.render(createElement(Harness, { run })));
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useExamSession — 학습 모드', () => {
  it('stores picks by original number and records once at 확인', () => {
    mount(makeRun(false));
    act(() => api().actions.pick(1)); // display 1 → original 4 (correct)
    expect(api().state.answers).toEqual({ '6-1': 4 });
    expect(api().displayPick).toBe(1);
    act(() => api().actions.check());
    expect(stats.recordAnswers).toHaveBeenCalledTimes(1);
    expect(stats.recordAnswers).toHaveBeenCalledWith([{ id: '6-1', correct: true, unsure: false }]);
    expect(api().revealed).toBe(true);
    expect(api().locked).toBe(true);
    act(() => api().actions.pick(2)); // locked after 확인
    expect(api().state.answers['6-1']).toBe(4);
    act(() => api().actions.check()); // second 확인 → next question
    expect(api().state.index).toBe(1);
    expect(stats.recordAnswers).toHaveBeenCalledTimes(1);
  });

  it('records 패스 as wrong, then batches the rest at submit without duplicates', () => {
    mount(makeRun(false));
    act(() => api().actions.pick(1));
    act(() => api().actions.check()); // 6-1 recorded
    act(() => api().actions.next());
    act(() => api().actions.pass()); // 6-2 recorded as wrong, moves on
    expect(stats.recordAnswers).toHaveBeenLastCalledWith([{ id: '6-2', correct: false, unsure: false }]);
    expect(api().state.index).toBe(2);
    act(() => api().actions.toggleUnsure());
    act(() => api().actions.pick(3)); // display 3 → original 2 (correct)
    act(() => api().actions.submit());
    expect(api().state.phase).toBe('result');
    expect(stats.recordAnswers).toHaveBeenCalledTimes(3);
    expect(stats.recordAnswers).toHaveBeenLastCalledWith([{ id: '6-3', correct: true, unsure: true }], expect.any(Date));
    expect(api().state.result?.correctCount).toBe(2);
    expect(getExamAnswers('session-6')).toEqual({ '6-1': 4, '6-3': 2 });
    expect(getHistory()[0].key).toBe('session-6');
    expect(stats.saveMockRecord).not.toHaveBeenCalled(); // 3-question study run
    expect(api().wrongTopics).toEqual([]);
  });

  it('marks 헷갈림 when 해설 is opened before 확인', () => {
    mount(makeRun(false));
    act(() => api().actions.toggleExplanation());
    expect(api().revealed).toBe(true);
    expect(api().state.unsure.has('6-1')).toBe(true);
    act(() => api().actions.pick(1));
    act(() => api().actions.check());
    expect(stats.recordAnswers).toHaveBeenCalledWith([{ id: '6-1', correct: true, unsure: true }]);
  });

  it('maps number keys to the display position and arrows to navigation', () => {
    mount(makeRun(false));
    press('4'); // display 4 → original 1
    expect(api().state.answers['6-1']).toBe(1);
    press('ArrowRight');
    expect(api().state.index).toBe(1);
    press('9'); // beyond the option count
    expect(api().state.answers['6-2']).toBeUndefined();
    press('ArrowLeft');
    expect(api().state.index).toBe(0);
  });

  it('retries only the wrong questions with a retry context', () => {
    mount(makeRun(false));
    act(() => api().actions.pick(1)); // 6-1 correct
    act(() => api().actions.submit());
    expect(api().wrongCount).toBe(2);
    act(() => api().actions.retryWrong());
    const next = onRestart.mock.calls[0][0] as ExamRun;
    expect(next.items.map(i => i.original.id)).toEqual(['6-2', '6-3']);
    expect(next.retryContext).toEqual({ totals: { 1: 1, 2: 1, 3: 1 }, baseCorrect: { 1: 1 } });
    expect(next.initialAnswers).toEqual({});
  });
});

describe('useExamSession — 실전 모드', () => {
  it('hides 확인/패스/해설 and records everything at submit', () => {
    mount(makeRun(true));
    act(() => api().actions.pick(2)); // original 3 (wrong)
    act(() => api().actions.check());
    act(() => api().actions.pass());
    act(() => api().actions.toggleExplanation());
    expect(api().revealed).toBe(false);
    expect(api().state.passed.size).toBe(0);
    expect(stats.recordAnswers).not.toHaveBeenCalled();
    act(() => api().actions.toggleUnsure()); // allowed in 실전 모드
    act(() => api().actions.submit());
    expect(stats.recordAnswers).toHaveBeenCalledTimes(1);
    expect(stats.recordAnswers).toHaveBeenCalledWith([{ id: '6-1', correct: false, unsure: true }], expect.any(Date));
    expect(stats.saveMockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'session-6', strict: true, shuffled: true, subjectScores: [0, 0, 0, -1] }),
    );
  });

  it('auto-submits when time runs out', () => {
    vi.useFakeTimers();
    mount(makeRun(true, 5));
    act(() => api().actions.pick(1));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(api().state.phase).toBe('result');
    expect(api().state.result?.timeTaken).toBe(5);
    expect(stats.recordAnswers).toHaveBeenCalledTimes(1);
  });

  it('does not submit when the confirm dialog is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mount(makeRun(true));
    act(() => api().actions.submit());
    expect(api().state.phase).toBe('exam');
  });
});
