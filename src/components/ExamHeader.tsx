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
  onSubmit: () => void;
  onHome: () => void;
  isSubmitted: boolean;
}

export default function ExamHeader({
  title,
  currentIndex,
  totalQuestions,
  timeRemaining,
  answeredCount,
  checkedCorrect,
  checkedWrong,
  onSubmit,
  onHome,
  isSubmitted,
}: ExamHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={onHome}
          className="text-gray-400 hover:text-gray-600 transition text-sm"
        >
          &larr; 홈
        </button>
        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
          {title}
        </h1>
        <span className="text-sm text-gray-400 hidden sm:inline">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-gray-500">답변</span>
          <span className="font-bold text-blue-600">{answeredCount}</span>
          <span className="text-gray-400">/ {totalQuestions}</span>
        </div>

        {(checkedCorrect > 0 || checkedWrong > 0) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-green-600">O {checkedCorrect}</span>
            <span className="font-bold text-red-600">X {checkedWrong}</span>
          </div>
        )}

        {!isSubmitted && (
          <>
            <div
              className={`font-mono text-sm sm:text-lg font-bold tabular-nums ${
                timeRemaining < 600 ? 'text-red-600 animate-pulse' : 'text-gray-700'
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
            <button
              onClick={onSubmit}
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
            >
              제출
            </button>
          </>
        )}

        {isSubmitted && (
          <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-bold rounded-lg">
            채점 완료
          </span>
        )}
      </div>
    </header>
  );
}
