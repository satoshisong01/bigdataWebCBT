'use client';

import { accuracyTone, percent } from './format';
import { BTN_PRIMARY, MUTED, TONE_PANEL, TONE_TEXT } from './ui';

interface ProgressBarProps {
  value: number;
  total: number;
  label: string;
  aside?: string;
}

export function ProgressBar({ value, total, label, aside }: ProgressBarProps) {
  const width = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center justify-between text-xs font-medium ${MUTED}`}>
        <span>{label}</span>
        {aside && <span>{aside}</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        className="h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden"
      >
        <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

interface AnswerBarProps {
  correct: boolean;
  isLast: boolean;
  onNext: () => void;
}

/** Result line + next button shown right under the options once answered. */
export function AnswerBar({ correct, isLast, onNext }: AnswerBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p
        role="status"
        className={`text-sm sm:text-base font-bold ${correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
      >
        {correct ? '정답이에요!' : '틀렸어요 — 초록색 보기가 정답이에요'}
      </p>
      <button type="button" onClick={onNext} className={BTN_PRIMARY}>
        {isLast ? '결과 보기' : '다음 문제'}
        <span aria-hidden className="hidden sm:inline text-xs font-normal opacity-75">Enter</span>
      </button>
    </div>
  );
}

interface ScoreBannerProps {
  correct: number;
  total: number;
  label: string;
}

export function ScoreBanner({ correct, total, label }: ScoreBannerProps) {
  const pct = percent(correct, total);
  const tone = total > 0 ? accuracyTone(pct) : 'none';
  return (
    <div className={`rounded-2xl border-2 p-6 sm:p-8 text-center ${TONE_PANEL[tone]}`}>
      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-4xl sm:text-5xl font-black ${TONE_TEXT[tone]}`}>{pct}점</p>
      <p className={`mt-2 text-sm ${MUTED}`}>
        {total}문제 중 {correct}개 정답
      </p>
    </div>
  );
}
