'use client';

import Link from 'next/link';
import { CRITERIA } from '@/data/criteria';
import type { CriteriaSub } from '@/data/criteria';
import type { TopicStat } from '@/lib/mastery';
import { heatTone } from './homeLogic';
import type { HeatTone } from './homeLogic';

interface CriteriaHeatmapProps {
  /** rollup(leafStats(...), 'sub') — keyed by 세부항목 id */
  stats: ReadonlyMap<string, TopicStat>;
}

const TONE: Readonly<Record<HeatTone, string>> = {
  none: 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400',
  danger: 'bg-red-100 border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300',
  low: 'bg-amber-100 border-amber-200 text-amber-900 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300',
  mid: 'bg-lime-100 border-lime-200 text-lime-900 dark:bg-lime-950/50 dark:border-lime-900 dark:text-lime-300',
  high: 'bg-green-200 border-green-300 text-green-900 dark:bg-green-900/50 dark:border-green-800 dark:text-green-200',
};

const LEGEND: ReadonlyArray<{ tone: HeatTone; label: string }> = [
  { tone: 'none', label: '미응시' },
  { tone: 'danger', label: '40 미만' },
  { tone: 'low', label: '40–59' },
  { tone: 'mid', label: '60–79' },
  { tone: 'high', label: '80+' },
];

interface HeatCellProps {
  sub: CriteriaSub;
  stat: TopicStat | undefined;
}

function HeatCell({ sub, stat }: HeatCellProps) {
  const attempted = stat?.attempted ?? 0;
  const questions = stat?.questions ?? 0;
  const title = attempted > 0 && stat
    ? `${sub.name} · 첫 풀이 ${stat.firstAccuracy}% · 최근 ${stat.accuracy}% · ${attempted}/${questions}문항`
    : `${sub.name} · 아직 안 푼 영역 (${questions}문항)`;
  return (
    <Link
      href={`/concepts?topic=${encodeURIComponent(sub.id)}`}
      title={title}
      className={`block rounded-lg border p-2 sm:p-2.5 hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500 transition ${TONE[heatTone(stat)]}`}
    >
      <span className="block text-[11px] sm:text-xs font-medium leading-tight line-clamp-2 min-h-[2.5em] break-keep">
        {sub.name}
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-sm sm:text-base font-black tabular-nums">
          {attempted > 0 && stat ? `${stat.firstAccuracy}%` : '—'}
        </span>
        <span className="text-[10px] opacity-75 tabular-nums">
          {attempted}/{questions}
        </span>
      </span>
    </Link>
  );
}

/** 출제기준 히트맵 — one cell per 세부항목, coloured by 첫 풀이 정답률 (grey until attempted) → /concepts?topic=S.M.U. */
export default function CriteriaHeatmap({ stats }: CriteriaHeatmapProps) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100">출제기준 히트맵</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">세부항목별 첫 풀이 정답률 · 칸을 누르면 개념 카드</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {CRITERIA.map(subject => (
          <div
            key={subject.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4"
          >
            <div className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-2">
              <span className="text-blue-600 dark:text-blue-400">{subject.id}과목</span> {subject.name}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {subject.majors.flatMap(major => major.subs).map(sub => (
                <HeatCell key={sub.id} sub={sub} stat={stats.get(sub.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">
        {LEGEND.map(item => (
          <li key={item.tone} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded border ${TONE[item.tone]}`} aria-hidden />
            {item.label}
          </li>
        ))}
        <li>· 숫자는 푼 문항/전체 문항</li>
      </ul>
    </section>
  );
}
