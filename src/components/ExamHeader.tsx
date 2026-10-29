'use client';

import { formatTime } from '@/lib/utils';

interface ExamHeaderProps {
  title: string;
  currentIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  answeredCount: number;
  checkedCorrect: number;
  checkedWrong: number;
  /** 실전 모드 badge, no live O/X */
  strict: boolean;
  isSubmitted: boolean;
  onSubmit: () => void;
  onHome: () => void;
  /** back to the score screen while reviewing */
  onShowResult: () => void;
}

const HOME_CLASS =
  'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition text-sm flex-shrink-0';

function StrictBadge() {
  return (
    <span className="flex-shrink-0 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold dark:bg-red-500">
      실전 모드
    </span>
  );
}

function timerClass(timeRemaining: number): string {
  return timeRemaining < 600 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-700 dark:text-slate-300';
}

export default function ExamHeader({
  title,
  currentIndex,
  totalQuestions,
  timeRemaining,
  answeredCount,
  checkedCorrect,
  checkedWrong,
  strict,
  isSubmitted,
  onSubmit,
  onHome,
  onShowResult,
}: ExamHeaderProps) {
  const showTally = !strict && (checkedCorrect > 0 || checkedWrong > 0);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
      {/* Desktop: single row */}
      <div className="hidden sm:flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onHome} className={HOME_CLASS}>
            &larr; 홈
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate max-w-xs">{title}</h1>
          {strict && <StrictBadge />}
          <span className="text-sm text-gray-400 dark:text-slate-500 flex-shrink-0">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-slate-400">답변</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{answeredCount}</span>
            <span className="text-gray-400 dark:text-slate-500">/ {totalQuestions}</span>
          </div>

          {showTally && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-green-600 dark:text-green-400">O {checkedCorrect}</span>
              <span className="font-bold text-red-600 dark:text-red-400">X {checkedWrong}</span>
            </div>
          )}

          {isSubmitted ? (
            <button
              type="button"
              onClick={onShowResult}
              className="px-4 py-2 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60 text-sm font-bold rounded-lg transition"
            >
              채점 결과 보기
            </button>
          ) : (
            <>
              <div className={`font-mono text-lg font-bold tabular-nums ${timerClass(timeRemaining)}`} aria-label="남은 시간">
                {formatTime(timeRemaining)}
              </div>
              <button
                type="button"
                onClick={onSubmit}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
              >
                제출
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: two rows */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={onHome} aria-label="홈으로" className={HOME_CLASS}>
              &larr;
            </button>
            <h1 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{title}</h1>
            {strict && <StrictBadge />}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSubmitted ? (
              <button
                type="button"
                onClick={onShowResult}
                className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-xs font-bold rounded"
              >
                결과 보기
              </button>
            ) : (
              <div className={`font-mono text-sm font-bold tabular-nums ${timerClass(timeRemaining)}`} aria-label="남은 시간">
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <span className="font-medium">
              {currentIndex + 1}/{totalQuestions}
            </span>
            <span>
              답변 <span className="font-bold text-blue-600 dark:text-blue-400">{answeredCount}</span>
            </span>
            {showTally && (
              <>
                <span className="font-bold text-green-600 dark:text-green-400">O{checkedCorrect}</span>
                <span className="font-bold text-red-600 dark:text-red-400">X{checkedWrong}</span>
              </>
            )}
          </div>
          {!isSubmitted && (
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
            >
              제출
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
