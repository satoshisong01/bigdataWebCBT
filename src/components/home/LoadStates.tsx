'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

/** Pulsing placeholder cards shown while a client-only page chunk loads (SSR-safe: no storage access). */
export function SectionsSkeleton() {
  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6"
      role="status"
      aria-label="불러오는 중"
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-28 sm:h-36 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
        />
      ))}
    </div>
  );
}

interface PageLoadingProps {
  title: string;
}

/** Loading state for the secondary pages: the sticky PageHeader plus skeleton cards. */
export function PageLoading({ title }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <PageHeader title={title} />
      <SectionsSkeleton />
    </div>
  );
}

/** Rendered in place of a page chunk that failed to download (typically offline before it was cached). */
export function ChunkLoadError() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 text-center">
        <p className="font-bold text-gray-800 dark:text-slate-100">화면을 불러오지 못했어요</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          인터넷 연결을 확인한 뒤 다시 시도해 주세요. 학습 기록은 그대로 남아 있어요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
