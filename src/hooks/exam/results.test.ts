import { describe, it, expect } from 'vitest';
import type { ExamResult, Question } from '@/types';
import { buildMockRecord, shouldSaveMock, subjectScoreArray, wrongTopicCounts } from './results';
import type { ExamItem, ExamRun } from './run';

function question(id: string, answer: number, topics?: string[]): Question {
  return {
    id,
    session: '제3회',
    sessionId: '3',
    subject: 3,
    subjectName: '빅데이터 모델링',
    number: 1,
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    answer,
    explanation: '',
    topics,
  };
}

const RESULT: ExamResult = {
  totalQuestions: 40,
  correctCount: 30,
  score: 75,
  subjectScores: [
    { subject: 1, subjectName: 'a', total: 20, correct: 15, score: 75, passed: true },
    { subject: 3, subjectName: 'c', total: 20, correct: 15, score: 75, passed: true },
  ],
  passed: true,
  timeTaken: 1234,
};

function runOf(size: number, strict: boolean, retry = false): ExamRun {
  const q = question('3-1', 1);
  const items: ExamItem[] = Array.from({ length: size }, () => ({ display: q, original: q, order: [1, 2, 3, 4] }));
  return {
    examKey: 'mock-7',
    title: 't',
    strict,
    shuffled: true,
    items,
    initialAnswers: {},
    retryContext: retry ? { totals: {}, baseCorrect: {} } : null,
    timeLimit: 7200,
  };
}

describe('wrongTopicCounts', () => {
  it('counts wrong and unanswered questions per 세세항목, most missed first', () => {
    const qs = [
      question('3-1', 1, ['3.1.1.1', '3.1.1.3']),
      question('3-2', 2, ['3.1.1.3']),
      question('3-3', 3, ['3.1.1.3', '3.1.1.3']), // duplicate tag counts once
      question('3-4', 4, ['3.1.1.1']), // answered correctly
      question('3-5', 1), // untagged
    ];
    const answers = { '3-1': 2, '3-2': 1, '3-4': 4 };
    expect(wrongTopicCounts(qs, answers)).toEqual([
      { topic: '3.1.1.3', name: '의사결정나무', count: 3 },
      { topic: '3.1.1.1', name: '회귀분석', count: 1 },
    ]);
  });

  it('caps the list and breaks ties by topic id in numeric order', () => {
    const qs = ['4.1.1.10', '4.1.1.2', '4.1.1.1'].map((t, i) => question(`4-${i}`, 1, [t]));
    expect(wrongTopicCounts(qs, {}, 2).map(t => t.topic)).toEqual(['4.1.1.1', '4.1.1.2']);
  });
});

describe('mock records', () => {
  it('maps subject scores to a fixed 4-slot array', () => {
    expect(subjectScoreArray(RESULT)).toEqual([75, -1, 75, -1]);
  });

  it('saves strict runs and long runs, never retries of wrong answers', () => {
    expect(shouldSaveMock(runOf(10, true))).toBe(true);
    expect(shouldSaveMock(runOf(40, false))).toBe(true);
    expect(shouldSaveMock(runOf(39, false))).toBe(false);
    expect(shouldSaveMock(runOf(80, true, true))).toBe(false);
  });

  it('builds the record from the run and result', () => {
    const now = new Date('2026-11-01T09:00:00Z');
    expect(buildMockRecord(runOf(40, true), RESULT, now)).toEqual({
      key: 'mock-7',
      date: '2026-11-01T09:00:00.000Z',
      score: 75,
      passed: true,
      subjectScores: [75, -1, 75, -1],
      total: 40,
      correct: 30,
      timeTaken: 1234,
      strict: true,
      shuffled: true,
    });
  });
});
