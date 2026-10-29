'use client';

import type { NavCellState } from '@/hooks/exam/state';
import { UNSURE_DOT, gridCellClass } from './navStyles';

interface MobileQuestionGridProps {
  ids: readonly string[];
  currentIndex: number;
  states: Readonly<Record<string, NavCellState>>;
  unsure: ReadonlySet<string>;
  onNavigate: (index: number) => void;
}

export default function MobileQuestionGrid({ ids, currentIndex, states, unsure, onNavigate }: MobileQuestionGridProps) {
  return (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-2 overflow-y-auto max-h-28 safe-bottom">
      <div className="grid grid-cols-10 gap-1 px-1 pt-1">
        {ids.map((id, idx) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(idx)}
            aria-label={`${idx + 1}번 문제로 이동`}
            aria-current={idx === currentIndex ? 'step' : undefined}
            className={`relative w-full aspect-square text-xs font-bold rounded transition ${gridCellClass(
              states[id] ?? 'idle',
              idx === currentIndex,
            )}`}
          >
            {idx + 1}
            {unsure.has(id) && <span className={UNSURE_DOT} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
