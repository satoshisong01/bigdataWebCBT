'use client';

import type { Grade } from '@/lib/srs';

export const GRADE_LABELS: Readonly<Record<Grade, string>> = {
  again: '모름',
  hard: '애매',
  good: '앎',
  easy: '쉬움',
};

const GRADE_CLASS: Readonly<Record<Grade, string>> = {
  again:
    'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40',
  hard:
    'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40',
  good:
    'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40',
  easy:
    'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40',
};

interface GradeButtonsProps {
  grades: readonly Grade[];
  onGrade: (grade: Grade) => void;
  /** caption under each label, e.g. the next review interval */
  hints?: Partial<Record<Grade, string>>;
  /** prefix labels with their 1–4 keyboard shortcut */
  showKeys?: boolean;
}

export default function GradeButtons({ grades, onGrade, hints, showKeys = false }: GradeButtonsProps) {
  return (
    <div className={`grid gap-2 ${grades.length >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {grades.map((grade, i) => (
        <button
          key={grade}
          type="button"
          onClick={() => onGrade(grade)}
          className={`rounded-lg border px-2 py-2 text-sm font-bold transition active:scale-[0.98] ${GRADE_CLASS[grade]}`}
        >
          {showKeys && (
            <span aria-hidden className="hidden sm:inline mr-1 text-xs font-normal opacity-60">
              {i + 1}
            </span>
          )}
          {GRADE_LABELS[grade]}
          {hints?.[grade] && <span className="block text-[11px] font-normal opacity-80">{hints[grade]}</span>}
        </button>
      ))}
    </div>
  );
}
