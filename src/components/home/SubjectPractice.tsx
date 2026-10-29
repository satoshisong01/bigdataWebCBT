'use client';

import Link from 'next/link';
import { SUBJECTS } from '@/data/subjects';
import type { ExamRecord } from '@/lib/storage';
import { sessionsInGroupOrder } from './homeLogic';

interface SubjectPracticeProps {
  history: readonly ExamRecord[];
  wrongCounts: Readonly<Record<string, number>>;
}

/** 과목별 풀기 — the existing per-subject buttons, sessions in the 회차별 풀기 group order. */
export default function SubjectPractice({ history, wrongCounts }: SubjectPracticeProps) {
  const sessions = sessionsInGroupOrder();
  const recordOf = (key: string): ExamRecord | undefined => history.find(r => r.key === key);
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100 mb-3 sm:mb-4">과목별 풀기</h2>
      <div className="space-y-3 sm:space-y-4">
        {SUBJECTS.map(subject => (
          <div
            key={subject.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold">{subject.id}과목</span>
              <span className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100">{subject.name}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:inline">회차당 20문항</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
              {sessions.map(session => {
                const subjectKey = `subject-${subject.id}-${session.id}`;
                const record = recordOf(subjectKey);
                const wrongCount = wrongCounts[subjectKey] ?? 0;
                return (
                  <div key={session.id} className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                    <Link
                      href={`/exam?mode=subject&id=${subject.id}&session=${encodeURIComponent(session.id)}`}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition w-full sm:w-auto justify-center sm:justify-start min-w-0 ${
                        record
                          ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900 hover:bg-green-100 dark:hover:bg-green-900/40 active:bg-green-200'
                          : 'bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-800 active:bg-blue-100'
                      }`}
                    >
                      <span className="truncate">{session.name}</span>
                      {record && <span className="text-xs opacity-75 flex-shrink-0">{record.score}점</span>}
                    </Link>
                    {record && wrongCount > 0 && (
                      <Link
                        href={`/exam?wrong=${encodeURIComponent(subjectKey)}`}
                        className="px-1 sm:px-1.5 py-1.5 sm:py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 active:text-red-800 transition flex-shrink-0"
                        title={`오답 ${wrongCount}문제 다시풀기`}
                      >
                        X{wrongCount}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
