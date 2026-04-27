'use client';

import { useMemo } from 'react';
import { StreakData } from '@/lib/storage';

interface StreakBadgeProps {
  streak: StreakData;
}

const CELLS = 35; // 5 weeks

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const studied = useMemo(() => new Set(streak.days), [streak.days]);

  const cells = useMemo(() => {
    const arr: Array<{ key: string; label: string; isStudied: boolean; isToday: boolean }> = [];
    const today = new Date();
    const todayKey = dateKey(today);
    for (let i = CELLS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dateKey(d);
      arr.push({
        key: k,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        isStudied: studied.has(k),
        isToday: k === todayKey,
      });
    }
    return arr;
  }, [studied]);

  if (streak.days.length === 0) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100">
          학습 스트릭
        </h3>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-gray-500 dark:text-slate-400">현재</span>{' '}
            <span className="font-bold text-orange-500">🔥 {streak.current}일</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-slate-400">최고</span>{' '}
            <span className="font-bold text-blue-600">{streak.best}일</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map(cell => (
          <div
            key={cell.key}
            title={`${cell.key}${cell.isStudied ? ' · 학습' : ''}${cell.isToday ? ' · 오늘' : ''}`}
            className={`aspect-square rounded sm:rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-medium ${
              cell.isStudied
                ? cell.isToday
                  ? 'bg-orange-500 text-white'
                  : 'bg-green-500 text-white'
                : cell.isToday
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600'
            }`}
          >
            {cell.label}
          </div>
        ))}
      </div>

      <div className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-2 sm:mt-3">
        최근 {CELLS}일 · 시험 제출 시 자동 기록
      </div>
    </section>
  );
}
