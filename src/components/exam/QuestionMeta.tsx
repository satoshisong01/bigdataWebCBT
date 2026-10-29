'use client';

import type { Question, QuestionSource } from '@/types';
import { SOURCE_LABELS, getSession } from '@/data/catalog';

const SOURCE_BADGE: Readonly<Record<QuestionSource, string>> = {
  restored: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
  'ai-mock': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900',
  'ai-trend': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:border-fuchsia-900',
};

interface QuestionMetaProps {
  question: Question;
}

/** 출처 배지 (기출복원 / AI 모의 / 최신경향(AI)) + 회차·번호 + 과목, shown above every question. */
export default function QuestionMeta({ question }: QuestionMetaProps) {
  const session = getSession(question.sessionId);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
      {session && (
        <span className={`px-2 py-0.5 rounded-full border font-bold ${SOURCE_BADGE[session.source]}`}>
          {SOURCE_LABELS[session.source]}
        </span>
      )}
      <span className="text-gray-500 dark:text-slate-400">
        {session?.name ?? question.session} · {question.number}번
      </span>
      <span className="text-blue-600 dark:text-blue-400 font-medium truncate">
        {question.subject}과목 {question.subjectName}
      </span>
    </div>
  );
}
