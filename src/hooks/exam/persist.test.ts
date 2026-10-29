import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExamResult, Question } from '@/types';

vi.mock('@/lib/stats', () => ({
  recordAnswers: vi.fn(),
  saveMockRecord: vi.fn(),
}));

import * as stats from '@/lib/stats';
import { getExamAnswers, getHistory, getRetryContext, getStreak, getWrongIds } from '@/lib/storage';
import { persistExamResult } from './persist';
import type { ExamRun } from './run';

function question(id: string, answer: number): Question {
  return {
    id,
    session: '제4회',
    sessionId: '4',
    subject: 1,
    subjectName: '빅데이터 분석 기획',
    number: 1,
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    answer,
    explanation: '',
  };
}

const QS = [question('4-1', 1), question('4-2', 2)];

function makeRun(strict: boolean): ExamRun {
  return {
    examKey: 'session-4',
    title: '제4회',
    strict,
    shuffled: strict,
    items: QS.map(q => ({ display: q, original: q, order: [1, 2, 3, 4] })),
    initialAnswers: {},
    retryContext: null,
    timeLimit: 180,
  };
}

const RESULT: ExamResult = {
  totalQuestions: 2,
  correctCount: 1,
  score: 50,
  subjectScores: [{ subject: 1, subjectName: '빅데이터 분석 기획', total: 2, correct: 1, score: 50, passed: true }],
  passed: false,
  timeTaken: 42,
};

const NOW = new Date('2026-11-02T10:00:00Z');

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('persistExamResult', () => {
  it('keeps the legacy writes and records pending answers', () => {
    const answers = { '4-1': 1, '4-2': 3 };
    const events = [{ id: '4-2', correct: false, unsure: false }];
    expect(persistExamResult({ run: makeRun(false), answers, result: RESULT, events, now: NOW })).toBe(true);
    expect(getHistory()).toEqual([{ key: 'session-4', score: 50, passed: false, date: '2026-11-02T10:00:00.000Z' }]);
    expect(getWrongIds('session-4')).toEqual(['4-2']);
    expect(getExamAnswers('session-4')).toEqual(answers);
    expect(getRetryContext('session-4')).toEqual({ totals: { 1: 2 }, baseCorrect: { 1: 1 } });
    expect(getStreak().days.length).toBe(1);
    expect(stats.recordAnswers).toHaveBeenCalledWith(events, NOW);
    expect(stats.saveMockRecord).not.toHaveBeenCalled(); // 2-question study run
  });

  it('saves a mock record for 실전 runs and skips recordAnswers when nothing is pending', () => {
    persistExamResult({ run: makeRun(true), answers: { '4-1': 1 }, result: RESULT, events: [], now: NOW });
    expect(stats.recordAnswers).not.toHaveBeenCalled();
    expect(stats.saveMockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'session-4', strict: true, shuffled: true, subjectScores: [50, -1, -1, -1] }),
    );
  });

  it('continues after a failing write and reports it', () => {
    vi.mocked(stats.recordAnswers).mockImplementationOnce(() => {
      throw new Error('quota');
    });
    const ok = persistExamResult({
      run: makeRun(true),
      answers: { '4-1': 1 },
      result: RESULT,
      events: [{ id: '4-1', correct: true }],
      now: NOW,
    });
    expect(ok).toBe(false);
    expect(stats.saveMockRecord).toHaveBeenCalled();
    expect(getRetryContext('session-4')).toBeDefined();
  });
});
