'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { CARD_META, QUESTION_META } from '@/data/meta';
import { diffDays, todayKey } from '@/lib/date';
import { studiedLeaves } from '@/lib/mastery';
import { buildPlan } from '@/lib/plan';
import type { PlanPhase } from '@/lib/plan';
import { getSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';
import { getCStats, getQStats } from '@/lib/stats';
import { useSyncRefresh } from '@/hooks/useSyncRefresh';
import { ddayLabel, planProgressPercent } from '@/components/home/homeLogic';
import PhaseTimeline from './PhaseTimeline';
import SubChecklist from './SubChecklist';

interface PlanSnapshot {
  today: string;
  settings: Settings;
  plan: PlanPhase[];
  /** studied 세세항목 ids (studiedLeaves) */
  studied: Set<string>;
}

function readPlanSnapshot(): PlanSnapshot {
  const settings = getSettings();
  return {
    today: todayKey(),
    settings,
    plan: buildPlan(settings.planStart, settings.examDate),
    studied: studiedLeaves({ bank: QUESTION_META, qstats: getQStats(), cards: CARD_META, cstats: getCStats() }),
  };
}

function SettingsIconLink() {
  return (
    <Link
      href="/settings"
      aria-label="설정"
      title="시험일·목표 설정"
      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition flex items-center justify-center text-base"
    >
      ⚙
    </Link>
  );
}

/** /plan — client-only (rendered with ssr: false) since the plan comes from stored settings. */
export default function PlanContent() {
  // Re-read storage after a sync brought in another device's records.
  const syncVersion = useSyncRefresh();
  return <PlanView key={syncVersion} />;
}

function PlanView() {
  const [{ today, settings, plan, studied }] = useState<PlanSnapshot>(readPlanSnapshot);
  const daysLeft = diffDays(today, settings.examDate);
  const overall = planProgressPercent(settings.planStart, settings.examDate, today);
  const totalDays = Math.max(0, diffDays(settings.planStart, settings.examDate));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <PageHeader
        title="학습 플랜"
        subtitle={`${settings.examDate} 시험 · ${ddayLabel(daysLeft)}${settings.examDateConfirmed ? '' : ' (예상 일정)'}`}
        right={<SettingsIconLink />}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-10">
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
              {ddayLabel(daysLeft)}
            </span>
            <span className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100 tabular-nums">
              {settings.examDate}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {settings.examDateConfirmed ? '공식 일정' : '예상 일정'}
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300 tabular-nums">
            플랜 시작 {settings.planStart} · 전체 {totalDays}일 · 진행 {overall}%
          </p>
          <div
            className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-label="전체 플랜 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall}
          >
            <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${overall}%` }} />
          </div>
          {daysLeft < 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              시험일이 지났어요. 다음 시험을 준비한다면{' '}
              <Link href="/settings" className="font-bold underline underline-offset-2">
                설정
              </Link>
              에서 시험일을 바꾸고 플랜을 오늘부터 다시 시작하세요.
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            단계는 남은 날을 개념 완성 40% · 기출·선지 분석 30% · 약점·신유형·계산 18% · 실전 리허설 12%로 나눠요.{' '}
            <Link
              href="/settings"
              className="font-bold text-blue-700 dark:text-blue-300 underline underline-offset-2"
            >
              시험일·일일 목표 변경 →
            </Link>
          </p>
        </section>

        <PhaseTimeline plan={plan} today={today} />
        <SubChecklist studied={studied} />
      </main>
    </div>
  );
}
