'use client';

import type { MigrationState } from './useHomeData';

interface MigrationNoticeProps {
  state: MigrationState;
  onRetry: () => void;
}

/** Status of the one-time legacy-stats migration; renders nothing once it is done. */
export default function MigrationNotice({ state, onRetry }: MigrationNoticeProps) {
  if (state === 'done') return null;
  if (state === 'running') {
    return (
      <p className="text-xs text-gray-500 dark:text-slate-400" role="status">
        학습 통계를 준비하는 중… (이전 풀이 기록을 새 통계로 옮기고 있어요)
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200"
    >
      <span>이전 풀이 기록을 새 통계로 옮기지 못했어요. 인터넷 연결을 확인해 주세요.</span>
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1 rounded-lg font-bold border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
      >
        다시 시도
      </button>
    </div>
  );
}
