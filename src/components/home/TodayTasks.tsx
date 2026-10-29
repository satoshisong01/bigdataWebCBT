'use client';

import Link from 'next/link';
import type { DailyTask } from '@/lib/plan';
import type { DayActivity } from '@/lib/stats';

interface TodayTasksProps {
  tasks: readonly DailyTask[];
  activity: DayActivity | undefined;
  /** live streak in days */
  streak: number;
}

const UNITS: Readonly<Record<DailyTask['id'], string>> = {
  review: '문제',
  cards: '장',
  concept: '장',
  questions: '문제',
  drill: '문제',
  mock: '문제',
};

/** Due-count tasks: the target shrinks as items are reviewed, so they show what is left. */
function isCountdown(task: DailyTask): boolean {
  return task.id === 'review' || task.id === 'cards';
}

function isComplete(task: DailyTask): boolean {
  return !isCountdown(task) && task.target > 0 && task.done >= task.target;
}

interface TaskRowProps {
  task: DailyTask;
}

function TaskRow({ task }: TaskRowProps) {
  const unit = UNITS[task.id];
  const complete = isComplete(task);
  const pct = task.target > 0 ? Math.min(100, Math.round((task.done / task.target) * 100)) : 0;
  return (
    <li className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-gray-800 dark:text-slate-100 truncate">{task.label}</span>
          <span className="text-xs tabular-nums text-gray-500 dark:text-slate-400 flex-shrink-0">
            {isCountdown(task)
              ? `${Math.max(0, task.target - task.done)}${unit} 남음`
              : `${task.done}/${task.target}${unit}`}
          </span>
        </div>
        {!isCountdown(task) && (
          <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                complete ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-500 dark:bg-blue-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <Link
        href={task.href}
        aria-label={`${task.label} ${complete ? '(완료) 더 하기' : '시작'}`}
        className={`flex-shrink-0 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition ${
          complete
            ? 'border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/40'
            : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400'
        }`}
      >
        {complete ? '완료 ✓' : '시작'}
      </Link>
    </li>
  );
}

function activityLine(a: DayActivity | undefined): string | null {
  if (!a || a.q + a.cards + a.drills === 0) return null;
  const parts = [
    a.q > 0 ? `문제 ${a.q}개 (정답률 ${Math.round((a.c / a.q) * 100)}%)` : null,
    a.cards > 0 ? `개념 카드 ${a.cards}장` : null,
    a.drills > 0 ? `계산 드릴 ${a.drills}개` : null,
  ];
  return `오늘 ${parts.filter((p): p is string => p !== null).join(' · ')}`;
}

/** 오늘의 학습 — dailyTasks() for today's plan phase, each with progress and a start link. */
export default function TodayTasks({ tasks, activity, streak }: TodayTasksProps) {
  const doneCount = tasks.filter(isComplete).length;
  const summary = activityLine(activity);
  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100">오늘의 학습</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-orange-600 dark:text-orange-400">
            {streak > 0 ? `🔥 ${streak}일 연속` : '오늘 시작하면 1일째'}
          </span>
          {tasks.length > 0 && (
            <span className="text-gray-500 dark:text-slate-400 tabular-nums">
              {doneCount}/{tasks.length} 완료
            </span>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          오늘 정해진 학습이 없어요. 시험일이 지났다면{' '}
          <Link href="/settings" className="underline underline-offset-2 text-blue-700 dark:text-blue-300">
            설정
          </Link>
          에서 다음 시험일을 입력하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}

      {summary && <p className="mt-3 sm:mt-4 text-xs text-gray-500 dark:text-slate-400">{summary}</p>}
    </section>
  );
}
