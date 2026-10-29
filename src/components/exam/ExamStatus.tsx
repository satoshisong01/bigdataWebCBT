'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { EmptyReason } from '@/hooks/exam/sources';

/** Light module on purpose: the /exam page imports it for its loading/offline fallbacks. */

interface ShellProps {
  children: ReactNode;
}

function StatusShell({ children }: ShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-4">{children}</div>
    </div>
  );
}

const HOME_LINK_CLASS =
  'inline-block px-4 py-2 rounded-lg text-sm font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 transition';
const PRIMARY_CLASS =
  'inline-block px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition';

export function ExamLoading() {
  return (
    <StatusShell>
      <div className="text-gray-500 dark:text-slate-400" role="status">
        문제를 불러오는 중...
      </div>
    </StatusShell>
  );
}

interface ExamErrorProps {
  detail?: string;
  onRetry: () => void;
}

export function ExamError({ detail, onRetry }: ExamErrorProps) {
  return (
    <StatusShell>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 space-y-3">
        <div className="text-lg font-bold text-gray-800 dark:text-slate-100">문제를 불러오지 못했어요</div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          오프라인이거나 연결이 불안정할 수 있어요. 연결을 확인한 뒤 다시 시도해 주세요.
        </p>
        {detail && <p className="text-xs text-gray-400 dark:text-slate-500 break-all">{detail}</p>}
        <div className="flex justify-center gap-2 pt-1">
          <button type="button" onClick={onRetry} className={PRIMARY_CLASS}>
            다시 시도
          </button>
          <Link href="/" className={HOME_LINK_CLASS}>
            홈으로
          </Link>
        </div>
      </div>
    </StatusShell>
  );
}

/** Shown when the exam page's own code chunk cannot be downloaded (offline before it was cached). */
export function ExamChunkError() {
  return <ExamError onRetry={() => window.location.reload()} />;
}

interface EmptyCopy {
  title: string;
  body: string;
  action?: { href: string; label: string };
}

function emptyCopy(reason: EmptyReason, topic: string | undefined): EmptyCopy {
  switch (reason) {
    case 'review':
      return {
        title: '오늘 복습할 문제가 없어요',
        body: '틀리거나 헷갈린 문제는 복습 주기(1·3·7·14·30·60일)에 맞춰 다시 나타나요.',
        action: { href: '/review', label: '개념 카드 복습하기' },
      };
    case 'wrong-pool':
      return { title: '오답노트가 비어 있어요', body: '틀리거나 "헷갈림"으로 표시한 문제가 이곳에 모여요.' };
    case 'bookmarks':
      return { title: '북마크한 문제가 없어요', body: '문제를 풀다가 ☆를 눌러 북마크하세요.' };
    case 'wrong':
      return { title: '다시 풀 오답이 없어요', body: '이 시험에서 틀린 문제가 없거나 기록이 지워졌어요.' };
    case 'weak':
      return {
        title: '약점 세트를 만들 수 없어요',
        body: '출제기준이 태그된 문제가 아직 없어요. 회차별 문제를 먼저 풀어 보세요.',
      };
    case 'topic':
      return {
        title: '이 범위의 문제가 아직 없어요',
        body: '개념 카드로 먼저 학습해 보세요.',
        action: topic ? { href: `/concepts?topic=${encodeURIComponent(topic)}`, label: '개념 학습으로' } : undefined,
      };
    case 'topic-invalid':
      return { title: '출제기준 항목을 찾을 수 없어요', body: '링크가 올바른지 확인해 주세요.' };
    case 'mock':
      return { title: '모의고사를 구성할 문제가 없어요', body: '문제은행이 비어 있어요. 잠시 후 다시 시도해 주세요.' };
    case 'session':
    case 'subject':
    case 'all':
      return { title: '문제를 찾을 수 없어요', body: '회차나 과목 정보가 올바른지 확인해 주세요.' };
  }
}

interface ExamEmptyProps {
  reason: EmptyReason;
  /** topic id for the 'topic' reason */
  topic?: string;
}

export function ExamEmpty({ reason, topic }: ExamEmptyProps) {
  const copy = emptyCopy(reason, topic);
  return (
    <StatusShell>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 space-y-3">
        <div className="text-lg font-bold text-gray-800 dark:text-slate-100">{copy.title}</div>
        <p className="text-sm text-gray-500 dark:text-slate-400">{copy.body}</p>
        <div className="flex justify-center gap-2 pt-1">
          {copy.action && (
            <Link href={copy.action.href} className={PRIMARY_CLASS}>
              {copy.action.label}
            </Link>
          )}
          <Link href="/" className={HOME_LINK_CLASS}>
            홈으로
          </Link>
        </div>
      </div>
    </StatusShell>
  );
}
