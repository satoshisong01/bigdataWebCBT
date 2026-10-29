'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import UpdatesBell from '@/components/UpdatesBell';
import { SESSIONS, TOTAL_QUESTIONS } from '@/data/catalog';

/** Size-matched placeholder while the client-only chip loads. */
function AccountChipPlaceholder() {
  return <span className="block h-10 w-20" aria-hidden />;
}

// The login state lives in localStorage, so only the account chip renders on the client.
const AccountChip = dynamic(() => import('./AccountChip'), { ssr: false, loading: () => <AccountChipPlaceholder /> });

/**
 * Home title bar — SSR-safe, rendered outside the client-only hub so it shows while data loads.
 * Below sm the account chip wraps onto its own row so the title keeps the full width.
 */
export default function HomeHeader() {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
            빅데이터분석기사 필기
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">
            출제기준 전범위 개념 · {SESSIONS.length}회차 {TOTAL_QUESTIONS}문항
          </p>
        </div>
        <div className="order-last w-full sm:order-none sm:w-auto min-w-0">
          <Suspense fallback={<AccountChipPlaceholder />}>
            <AccountChip />
          </Suspense>
        </div>
        <UpdatesBell />
        <Link
          href="/settings"
          aria-label="설정"
          title="설정"
          className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition flex items-center justify-center text-base flex-shrink-0"
        >
          ⚙
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
