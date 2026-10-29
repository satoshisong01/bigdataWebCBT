import { describe, it, expect } from 'vitest';
import { addDays, diffDays } from '@/lib/date';
import type { DayActivity } from '@/lib/stats';
import { buildPlan, dailyTasks, phaseOn } from '@/lib/plan';
import type { DailyTask, DailyTaskInput, PlanPhase } from '@/lib/plan';

function lengths(plan: readonly PlanPhase[]): number[] {
  return plan.map(p => diffDays(p.start, p.end) + 1);
}

describe('buildPlan', () => {
  it('splits the default horizon 40/30/18/12 by largest remainder', () => {
    const plan = buildPlan('2026-10-29', '2027-04-03'); // 156 days
    expect(plan.map(p => p.id)).toEqual([1, 2, 3, 4]);
    expect(plan.map(p => p.name)).toEqual(['개념 완성', '기출·선지 분석', '약점·신유형·계산', '실전 리허설']);
    expect(lengths(plan)).toEqual([62, 47, 28, 19]);
    expect(plan.map(p => [p.start, p.end])).toEqual([
      ['2026-10-29', '2026-12-29'],
      ['2026-12-30', '2027-02-14'],
      ['2027-02-15', '2027-03-14'],
      ['2027-03-15', '2027-04-02'],
    ]);
    for (const p of plan) {
      expect(p.focus.length).toBeGreaterThan(0);
      expect(p.activities.length).toBeGreaterThan(0);
    }
  });

  it('covers [start, exam - 1] with consecutive phases of at least one day, close to the shares', () => {
    const start = '2026-10-29';
    for (let days = 4; days <= 400; days++) {
      const exam = addDays(start, days);
      const plan = buildPlan(start, exam);
      const len = lengths(plan);
      expect(plan).toHaveLength(4);
      expect(plan[0].start).toBe(start);
      expect(plan[3].end).toBe(addDays(exam, -1));
      plan.slice(1).forEach((p, i) => expect(p.start).toBe(addDays(plan[i].end, 1)));
      expect(len.every(d => d >= 1)).toBe(true);
      expect(len.reduce((sum, d) => sum + d, 0)).toBe(days);
      if (days >= 5) {
        [40, 30, 18, 12].forEach((share, i) => expect(Math.abs(len[i] - (days * share) / 100)).toBeLessThan(1));
      }
    }
  });

  it('keeps 실전 리허설 last and drops phases from the front when fewer than 4 days remain', () => {
    expect(buildPlan('2026-10-29', '2026-10-30').map(p => [p.id, p.start, p.end])).toEqual([[4, '2026-10-29', '2026-10-29']]);
    expect(buildPlan('2026-10-29', '2026-10-31').map(p => p.id)).toEqual([3, 4]);
    expect(buildPlan('2026-10-29', '2026-11-01').map(p => p.id)).toEqual([2, 3, 4]);
    expect(lengths(buildPlan('2026-10-29', '2026-11-01'))).toEqual([1, 1, 1]);
    expect(lengths(buildPlan('2026-10-29', '2026-11-02'))).toEqual([1, 1, 1, 1]);
    expect(lengths(buildPlan('2026-10-29', '2026-11-03'))).toEqual([2, 1, 1, 1]);
  });

  it('crosses month and year boundaries', () => {
    expect(buildPlan('2026-12-31', '2027-01-05').map(p => [p.start, p.end])).toEqual([
      ['2026-12-31', '2027-01-01'],
      ['2027-01-02', '2027-01-02'],
      ['2027-01-03', '2027-01-03'],
      ['2027-01-04', '2027-01-04'],
    ]);
  });

  it('returns [] when the exam is today or in the past, or a date is invalid', () => {
    expect(buildPlan('2026-10-29', '2026-10-29')).toEqual([]);
    expect(buildPlan('2026-10-29', '2026-09-05')).toEqual([]);
    expect(buildPlan('2026-10-29', 'not-a-date')).toEqual([]);
    expect(buildPlan('', '2027-04-03')).toEqual([]);
  });
});

describe('phaseOn', () => {
  const plan = buildPlan('2026-10-29', '2027-04-03');

  it('finds the phase containing the day, inclusive at both ends', () => {
    expect(phaseOn(plan, '2026-10-29')?.id).toBe(1);
    expect(phaseOn(plan, '2026-12-29')?.id).toBe(1);
    expect(phaseOn(plan, '2026-12-30')?.id).toBe(2);
    expect(phaseOn(plan, '2027-03-14')?.id).toBe(3);
    expect(phaseOn(plan, '2027-04-02')?.id).toBe(4);
  });

  it('is undefined outside the plan', () => {
    expect(phaseOn(plan, '2026-10-28')).toBeUndefined();
    expect(phaseOn(plan, '2027-04-03')).toBeUndefined();
    expect(phaseOn([], '2026-10-29')).toBeUndefined();
  });
});

describe('dailyTasks', () => {
  const PLAN = buildPlan('2026-10-29', '2027-04-03');
  const ACTIVITY: DayActivity = { q: 12, c: 9, cards: 45, drills: 3 };

  function tasks(patch: Partial<DailyTaskInput>): DailyTask[] {
    return dailyTasks({
      today: '2026-11-02',
      phase: PLAN[0],
      dueQuestions: 0,
      dueCards: 0,
      activityToday: undefined,
      dailyQuestionGoal: 40,
      dailyCardGoal: 30,
      ...patch,
    });
  }

  it('starts with due reviews, then phase 1 concept study and questions', () => {
    const list = tasks({
      dueQuestions: 7,
      dueCards: 12,
      activityToday: ACTIVITY,
      nextTopic: { id: '1.2.1', name: '빅데이터 플랫폼' },
    });
    expect(list).toEqual([
      { id: 'review', label: '오답·헷갈림 복습', href: '/review', target: 7, done: 0 },
      { id: 'cards', label: '개념 카드 복습', href: '/review', target: 12, done: 0 },
      { id: 'concept', label: '개념 학습 · 빅데이터 플랫폼', href: '/concepts?topic=1.2.1', target: 30, done: 30 },
      { id: 'questions', label: '문제 풀기', href: '/exam?pool=weak', target: 40, done: 12 },
    ]);
  });

  it('omits reviews when nothing is due and links the concept tree without a next topic', () => {
    const list = tasks({});
    expect(list.map(t => t.id)).toEqual(['concept', 'questions']);
    expect(list[0]).toMatchObject({ label: '개념 학습', href: '/concepts', done: 0 });
  });

  it.each([
    [2, ['questions']],
    [3, ['questions', 'drill']],
    [4, ['mock', 'drill']],
  ] as const)('phase %i adds %j', (id, expected) => {
    expect(tasks({ phase: PLAN[id - 1], dueQuestions: 1 }).map(t => t.id)).toEqual(['review', ...expected]);
  });

  it('uses the documented routes and targets in phases 3 and 4', () => {
    expect(tasks({ phase: PLAN[2], activityToday: ACTIVITY })).toEqual([
      { id: 'questions', label: '약점 집중 문제', href: '/exam?pool=weak', target: 40, done: 12 },
      { id: 'drill', label: '계산 드릴', href: '/drill', target: 20, done: 3 },
    ]);
    const phase4 = tasks({ phase: PLAN[3], activityToday: { q: 95, c: 70, cards: 0, drills: 0 } });
    expect(phase4[0]).toEqual({ id: 'mock', label: '실전 모의고사 1회', href: '/exam?pool=mock&strict=1', target: 80, done: 80 });
    expect(phase4[1]).toMatchObject({ id: 'drill', href: '/drill', target: 10, done: 0 });
  });

  it('lists only due reviews outside the plan', () => {
    expect(tasks({ phase: undefined, dueQuestions: 3 }).map(t => t.id)).toEqual(['review']);
    expect(tasks({ phase: undefined })).toEqual([]);
  });
});
