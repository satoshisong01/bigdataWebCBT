'use client';

import { useMemo } from 'react';
import type { Question } from '@/types';
import type { NavCellState } from '@/hooks/exam/state';
import { UNSURE_DOT, sidebarCellClass } from './exam/navStyles';

interface QuestionNavProps {
  questions: readonly Question[];
  currentIndex: number;
  states: Readonly<Record<string, NavCellState>>;
  unsure: ReadonlySet<string>;
  onNavigate: (index: number) => void;
  /** after submit: show the 정답/오답/미응답 legend */
  isSubmitted: boolean;
}

interface Group {
  subject: number;
  name: string;
  indices: number[];
}

export default function QuestionNav({ questions, currentIndex, states, unsure, onNavigate, isSubmitted }: QuestionNavProps) {
  const groups = useMemo<Group[]>(() => {
    const bySubject = new Map<number, Group>();
    questions.forEach((q, idx) => {
      const group = bySubject.get(q.subject) ?? { subject: q.subject, name: q.subjectName, indices: [] };
      bySubject.set(q.subject, { ...group, indices: [...group.indices, idx] });
    });
    return [...bySubject.values()].sort((a, b) => a.subject - b.subject);
  }, [questions]);

  return (
    <div className="space-y-4">
      {groups.map(({ subject, name, indices }) => (
        <div key={subject}>
          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 truncate" title={name}>
            {subject}과목
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {indices.map(index => {
              const id = questions[index].id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(index)}
                  aria-label={`${index + 1}번 문제로 이동`}
                  aria-current={index === currentIndex ? 'step' : undefined}
                  className={`relative w-9 h-9 text-xs font-bold rounded border transition ${sidebarCellClass(
                    states[id] ?? 'idle',
                    index === currentIndex,
                  )}`}
                >
                  {index + 1}
                  {unsure.has(id) && <span className={UNSURE_DOT} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
        {isSubmitted && (
          <>
            <LegendItem swatch="bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-800" label="정답" />
            <LegendItem swatch="bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-800" label="오답" />
            <LegendItem swatch="bg-gray-100 border-gray-200 dark:bg-slate-800 dark:border-slate-700" label="미응답" />
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" aria-hidden="true" />
          헷갈림 표시
        </div>
      </div>
    </div>
  );
}

interface LegendItemProps {
  swatch: string;
  label: string;
}

function LegendItem({ swatch, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded border ${swatch}`} aria-hidden="true" />
      {label}
    </div>
  );
}
