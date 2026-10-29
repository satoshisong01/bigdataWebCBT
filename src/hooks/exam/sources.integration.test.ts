import { describe, it, expect, beforeEach } from 'vitest';
import { getDeckQuestionIds, getMockRecords, getQStats, recordAnswers } from '@/lib/stats';
import { addDays, todayKey, parseDayKey } from '@/lib/date';
import { calculateResult } from '@/lib/utils';
import { parseExamParams } from './params';
import { loadExam, type ExamLoadOutcome } from './sources';
import { persistExamResult } from './persist';
import type { ExamRun } from './run';

// No mocks: real bank chunks, stats, settings, compose and mastery.
const load = (query: string) => loadExam(parseExamParams(new URLSearchParams(query)));

function ready(out: ExamLoadOutcome): ExamRun {
  if (out.kind !== 'ready') throw new Error(`expected ready, got empty (${out.reason})`);
  return out.run;
}

beforeEach(() => {
  localStorage.clear();
});

describe('loadExam with the real modules', () => {
  it('loads a 회차 with options shuffled by default and the original kept for grading', async () => {
    const run = ready(await load('mode=session&id=5'));
    expect(run.items).toHaveLength(80);
    expect(run.shuffled).toBe(true); // settings default: shuffleOptions ON
    for (const { display, original, order } of run.items) {
      expect(display.options[display.answer - 1]).toBe(original.options[original.answer - 1]);
      expect([...order].sort()).toEqual(original.options.map((_, i) => i + 1));
    }
  });

  it('composes a reproducible 80-question 실전 모의고사 from the seed', async () => {
    const a = ready(await load('pool=mock&seed=42&strict=1'));
    const b = ready(await load('pool=mock&seed=42&strict=1'));
    expect(a.items).toHaveLength(80);
    expect(a.items.map(i => i.original.id)).toEqual(b.items.map(i => i.original.id));
    expect(a.items.map(i => i.order)).toEqual(b.items.map(i => i.order));
    expect(a.timeLimit).toBe(7200);
    expect(new Set(a.items.map(i => i.original.subject))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('serves due questions for 오늘의 복습 and the whole deck for 오답노트', async () => {
    expect(await load('pool=review')).toEqual({ kind: 'empty', reason: 'review' });
    const yesterday = parseDayKey(addDays(todayKey(), -1));
    recordAnswers([{ id: '5-1', correct: false }], yesterday); // due today
    recordAnswers([{ id: '5-2', correct: false }]); // due tomorrow
    expect(ready(await load('pool=review')).items.map(i => i.original.id)).toEqual(['5-1']);
    expect(ready(await load('pool=wrong-pool')).items.map(i => i.original.id).sort()).toEqual(['5-1', '5-2']);
  });

  it('persists a finished strict run into stats, deck and mock records', async () => {
    const run = ready(await load('mode=session&id=5&strict=1'));
    const first = run.items[0].original;
    const wrongPick = first.answer === 1 ? 2 : 1;
    const answers = { [first.id]: wrongPick };
    const result = calculateResult(run.items.map(i => i.original), answers, 600);
    const ok = persistExamResult({
      run,
      answers,
      result,
      events: [{ id: first.id, correct: false, unsure: false }],
      now: new Date(),
    });
    expect(ok).toBe(true);
    expect(getQStats()[first.id]).toMatchObject({ n: 1, c: 0, ok: false });
    expect(getDeckQuestionIds()).toContain(first.id);
    const [mock] = getMockRecords();
    expect(mock).toMatchObject({ key: 'session-5', strict: true, shuffled: true, total: 80 });
    expect(mock.subjectScores).toHaveLength(4);
  });
});
