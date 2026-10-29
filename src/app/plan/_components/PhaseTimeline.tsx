'use client';

import Link from 'next/link';
import type { PlanPhase } from '@/lib/plan';
import { daysLeftInPhase, formatMonthDay, phaseLength, phaseStatus } from '@/components/home/homeLogic';
import type { PhaseStatus } from '@/components/home/homeLogic';
import { diffDays } from '@/lib/date';

interface PhaseTimelineProps {
  plan: readonly PlanPhase[];
  today: string;
}

const CARD: Readonly<Record<PhaseStatus, string>> = {
  current: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-900',
  upcoming: 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900',
  done: 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60',
};

const DOT: Readonly<Record<PhaseStatus, string>> = {
  current: 'bg-blue-600 text-white dark:bg-blue-500',
  upcoming: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  done: 'bg-green-500 text-white dark:bg-green-600',
};

function statusText(phase: PlanPhase, status: PhaseStatus, today: string): string {
  if (status === 'current') return `진행 중 · ${daysLeftInPhase(phase, today)}일 남음`;
  if (status === 'upcoming') return `${diffDays(today, phase.start)}일 후 시작`;
  return '완료';
}

interface ActivityListProps {
  activities: readonly string[];
}

function ActivityList({ activities }: ActivityListProps) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-slate-300 list-disc pl-5">
      {activities.map((activity, i) => (
        <li key={i}>{activity}</li>
      ))}
    </ul>
  );
}

interface PhaseItemProps {
  phase: PlanPhase;
  today: string;
}

function PhaseItem({ phase, today }: PhaseItemProps) {
  const status = phaseStatus(phase, today);
  return (
    <li className={`rounded-xl border p-4 sm:p-5 ${CARD[status]}`} aria-current={status === 'current' ? 'step' : undefined}>
      <div className="flex items-start gap-3">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${DOT[status]}`}
          aria-hidden
        >
          {status === 'done' ? '✓' : phase.id}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">
              {phase.id}단계 · {phase.name}
            </h3>
            <span className="text-xs tabular-nums text-gray-500 dark:text-slate-400">
              {formatMonthDay(phase.start)} ~ {formatMonthDay(phase.end)} · {phaseLength(phase)}일
            </span>
          </div>
          <p
            className={`text-xs font-bold mt-0.5 ${
              status === 'current' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            {statusText(phase, status, today)}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">{phase.focus}</p>
          {status === 'current' ? (
            <ActivityList activities={phase.activities} />
          ) : (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300">
                할 일 보기
              </summary>
              <ActivityList activities={phase.activities} />
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

/** 4단계 타임라인 — dates, length, days left; the current phase is highlighted with its activities open. */
export default function PhaseTimeline({ plan, today }: PhaseTimelineProps) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100 mb-3 sm:mb-4">단계별 플랜</h2>
      {plan.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 text-sm text-gray-600 dark:text-slate-300">
          시험일이 플랜 시작일과 같거나 그보다 빨라서 플랜을 나눌 수 없어요.{' '}
          <Link href="/settings" className="font-bold text-blue-700 dark:text-blue-300 underline underline-offset-2">
            설정
          </Link>
          에서 시험일을 바꾸거나 플랜을 오늘부터 다시 시작하세요.
        </div>
      ) : (
        <ol className="space-y-3">
          {plan.map(phase => (
            <PhaseItem key={phase.id} phase={phase} today={today} />
          ))}
        </ol>
      )}
    </section>
  );
}
