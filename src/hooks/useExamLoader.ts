'use client';

import { useEffect, useMemo, useState } from 'react';
import { Question } from '@/types';
import {
  getQuestionsBySession,
  getQuestionsBySubject,
  getQuestionsBySubjectAndSession,
  getQuestionsByIds,
  getAllQuestions,
} from '@/data';
import {
  getActiveWrongIds,
  getBookmarks,
  getWrongIds,
  getRetryContext,
  getExamAnswers,
  RetryContext,
} from '@/lib/storage';

export interface ExamLoaderParams {
  mode: string;
  id: string;
  sessionParam: string | null;
  wrongOf: string | null;
  pool: string | null;
}

export interface ExamLoaderResult {
  questions: Question[];
  initialAnswers: Record<string, number>;
  initialRetryContext: RetryContext | null;
  examKey: string;
}

function buildExamKey({ mode, id, sessionParam, wrongOf, pool }: ExamLoaderParams): string {
  if (pool === 'wrong-pool') return 'pool-wrong';
  if (pool === 'bookmarks') return 'pool-bookmarks';
  if (wrongOf) return wrongOf;
  if (mode === 'session') return `session-${id}`;
  if (mode === 'subject' && sessionParam) return `subject-${id}-${sessionParam}`;
  return 'all';
}

function loadQuestions({ mode, id, sessionParam, wrongOf, pool }: ExamLoaderParams): Question[] {
  if (pool === 'wrong-pool') return getQuestionsByIds(getActiveWrongIds());
  if (pool === 'bookmarks') return getQuestionsByIds(getBookmarks());
  if (wrongOf) return getQuestionsByIds(getWrongIds(wrongOf));
  if (mode === 'session') return getQuestionsBySession(id);
  if (mode === 'subject') {
    if (sessionParam) return getQuestionsBySubjectAndSession(parseInt(id, 10), sessionParam);
    return getQuestionsBySubject(parseInt(id, 10));
  }
  return getAllQuestions();
}

export function useExamLoader(params: ExamLoaderParams): ExamLoaderResult {
  const { mode, id, sessionParam, wrongOf, pool } = params;

  const examKey = useMemo(
    () => buildExamKey(params),
    [mode, id, sessionParam, wrongOf, pool],
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, number>>({});
  const [initialRetryContext, setInitialRetryContext] = useState<RetryContext | null>(null);

  useEffect(() => {
    const loaded = loadQuestions(params);
    setQuestions(loaded);
    setInitialAnswers(getExamAnswers(examKey) ?? {});
    setInitialRetryContext(wrongOf ? getRetryContext(wrongOf) ?? null : null);
  }, [mode, id, sessionParam, wrongOf, pool, examKey]);

  return { questions, initialAnswers, initialRetryContext, examKey };
}
