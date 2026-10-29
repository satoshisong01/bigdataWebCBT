'use client';

import Link from 'next/link';
import { SOURCE_LABELS, sessionsBySource } from '@/data/catalog';
import type { ExamSession } from '@/types';
import type { ExamRecord } from '@/lib/storage';
import { SESSION_GROUPS } from './homeLogic';

interface SessionGroupsProps {
  history: readonly ExamRecord[];
  wrongCounts: Readonly<Record<string, number>>;
}

interface SessionCardProps {
  session: ExamSession;
  record: ExamRecord | undefined;
  wrongCount: number;
}

function SessionCard({ session, record, wrongCount }: SessionCardProps) {
  const examKey = `session-${session.id}`;
  return (
    <div
      className={`p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl border transition relative ${
        record ? 'border-green-300 dark:border-green-800' : 'border-gray-200 dark:border-slate-800'
      }`}
    >
      {record && (
        <span
          className={`absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full ${
            record.passed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          }`}
        >
          {record.score}점
        </span>
      )}
      <Link href={`/exam?mode=session&id=${encodeURIComponent(session.id)}`} className="block group pr-14">
        <div className="text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {session.name}
        </div>
        <div className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 mt-1">
          {SOURCE_LABELS[session.source]} &middot; {session.questionCount}문항 &middot; 120분
        </div>
      </Link>
      {record && wrongCount > 0 && (
        <Link
          href={`/exam?wrong=${encodeURIComponent(examKey)}`}
          className="inline-block mt-2 sm:mt-3 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 active:bg-red-200 transition"
        >
          오답 {wrongCount}문제 다시풀기
        </Link>
      )}
    </div>
  );
}

/** 회차별 풀기 — 최신경향 대비 / 기출복원 / AI 모의고사, each with the existing session-card look. */
export default function SessionGroups({ history, wrongCounts }: SessionGroupsProps) {
  const recordOf = (key: string): ExamRecord | undefined => history.find(r => r.key === key);
  return (
    <section className="space-y-5 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100">회차별 풀기</h2>
      {SESSION_GROUPS.map(group => {
        const sessions = sessionsBySource(group.source);
        if (sessions.length === 0) return null;
        return (
          <div key={group.source}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-700 dark:text-slate-200">{group.title}</h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">{group.desc}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {sessions.map(session => {
                const key = `session-${session.id}`;
                return (
                  <SessionCard
                    key={session.id}
                    session={session}
                    record={recordOf(key)}
                    wrongCount={wrongCounts[key] ?? 0}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
