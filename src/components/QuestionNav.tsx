'use client';

import { useMemo } from 'react';
import { Question } from '@/types';

interface QuestionNavProps {
  questions: readonly Question[];
  currentIndex: number;
  answers: Readonly<Record<string, number>>;
  onNavigate: (index: number) => void;
  isSubmitted: boolean;
  correctAnswers?: Readonly<Record<string, boolean>>;
  checkedAnswers?: Readonly<Record<string, boolean>>;
  passedIds?: ReadonlySet<string>;
}

export default function QuestionNav({
  questions,
  currentIndex,
  answers,
  onNavigate,
  isSubmitted,
  correctAnswers,
  checkedAnswers,
  passedIds,
}: QuestionNavProps) {
  const groups = useMemo(() => {
    const map = new Map<number, { name: string; indices: number[] }>();
    questions.forEach((q, idx) => {
      const entry = map.get(q.subject) ?? { name: q.subjectName, indices: [] };
      entry.indices.push(idx);
      map.set(q.subject, entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [questions]);

  const getButtonClass = (index: number): string => {
    const qId = questions[index].id;
    const isCurrent = index === currentIndex;
    const isAnswered = answers[qId] !== undefined;

    if (isSubmitted && correctAnswers) {
      const isCorrect = correctAnswers[qId];
      if (isCurrent) {
        return isCorrect
          ? 'bg-green-600 text-white ring-2 ring-green-300'
          : 'bg-red-600 text-white ring-2 ring-red-300';
      }
      if (isCorrect) return 'bg-green-100 text-green-800 border-green-300';
      if (isAnswered) return 'bg-red-100 text-red-800 border-red-300';
      return 'bg-gray-100 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800';
    }

    if (passedIds?.has(qId)) {
      if (isCurrent) return 'bg-yellow-500 text-white ring-2 ring-yellow-300';
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }

    if (checkedAnswers && checkedAnswers[qId] !== undefined) {
      const isCorrect = checkedAnswers[qId];
      if (isCurrent) {
        return isCorrect
          ? 'bg-green-600 text-white ring-2 ring-green-300'
          : 'bg-red-600 text-white ring-2 ring-red-300';
      }
      if (isCorrect) return 'bg-green-100 text-green-800 border-green-300';
      return 'bg-red-100 text-red-800 border-red-300';
    }

    if (isCurrent) return 'bg-blue-600 text-white ring-2 ring-blue-300';
    if (isAnswered) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-white text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950';
  };

  return (
    <div className="space-y-4">
      {groups.map(([subjectId, { name, indices }]) => (
        <div key={subjectId}>
          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 truncate" title={name}>
            {subjectId}과목
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {indices.map(index => (
              <button
                key={index}
                onClick={() => onNavigate(index)}
                className={`w-9 h-9 text-xs font-bold rounded border transition ${getButtonClass(index)}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      ))}

      {isSubmitted && correctAnswers && (
        <div className="pt-3 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            정답
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            오답
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 dark:border-slate-800" />
            미응답
          </div>
        </div>
      )}
    </div>
  );
}
