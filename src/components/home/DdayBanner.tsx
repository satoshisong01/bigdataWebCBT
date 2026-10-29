'use client';

import Link from 'next/link';
import { diffDays } from '@/lib/date';
import type { PlanPhase } from '@/lib/plan';
import type { Settings } from '@/lib/settings';
import { daysLeftInPhase, ddayLabel, formatMonthDay, planProgressPercent } from './homeLogic';

interface DdayBannerProps {
  today: string;
  settings: Settings;
  plan: readonly PlanPhase[];
  phase: PlanPhase | undefined;
}

function idleTitle(daysLeft: number, plan: readonly PlanPhase[], today: string): string {
  if (daysLeft < 0) return '시험일이 지났어요 · 다음 시험일을 설정하세요';
  if (daysLeft === 0) return '시험 당일 · 오답 노트만 가볍게 보고 컨디션을 지키세요';
  if (plan.length === 0) return '플랜을 만들 수 없어요 · 시험일을 확인하세요';
  if (plan[0].start > today) return `${plan[0].start}부터 플랜이 시작돼요`;
  return '학습 플랜';
}

/** 시험까지 남은 날 + 현재 플랜 단계 + 전체 진행률 (→ /plan). */
export default function DdayBanner({ today, settings, plan, phase }: DdayBannerProps) {
  const daysLeft = diffDays(today, settings.examDate);
  const progress = planProgressPercent(settings.planStart, settings.examDate, today);

  return (
    <section className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-300 tabular-nums tracking-tight">
          {ddayLabel(daysLeft)}
        </span>
        <span className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100 tabular-nums">
          {settings.examDate}
        </span>
        {settings.examDateConfirmed ? (
          <span className="text-xs font-bold text-green-700 dark:text-green-400">공식 일정</span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-slate-400">
            (예상 ·{' '}
            <Link
              href="/settings"
              className="underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300"
            >
              설정에서 변경
            </Link>
            )
          </span>
        )}
      </div>

      <Link href="/plan" className="mt-3 sm:mt-4 block group">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-bold text-gray-800 dark:text-slate-100 truncate">
            {phase ? `${phase.id}단계 · ${phase.name}` : idleTitle(daysLeft, plan, today)}
          </span>
          {phase && (
            <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0 tabular-nums">
              ~{formatMonthDay(phase.end)} · {daysLeftInPhase(phase, today)}일 남음
            </span>
          )}
        </div>
        {phase && (
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">{phase.focus}</p>
        )}
        <div
          className="mt-2.5 h-2 rounded-full bg-blue-100 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-label="전체 플랜 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">
          <span className="tabular-nums">전체 진행 {progress}%</span>
          <span className="font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">
            학습 플랜 보기 →
          </span>
        </div>
      </Link>
    </section>
  );
}
