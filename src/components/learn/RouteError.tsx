'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { BTN_PRIMARY, BTN_SECONDARY, MAIN, PAGE } from './ui';

interface RouteErrorProps {
  title: string;
}

/**
 * Route error boundary UI (error.tsx). A failed chunk import stays failed inside React.lazy,
 * so recovery is a full reload rather than a re-render.
 */
export default function RouteError({ title }: RouteErrorProps) {
  return (
    <div className={PAGE}>
      <PageHeader title={title} />
      <main className={MAIN}>
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 sm:p-6 space-y-3"
        >
          <p className="font-bold text-red-700 dark:text-red-300">화면을 불러오지 못했어요</p>
          <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">
            인터넷 연결을 확인한 뒤 새로고침해 주세요. 학습 기록은 이 기기에 그대로 저장되어 있어요.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.reload()} className={BTN_PRIMARY}>
              새로고침
            </button>
            <Link href="/" className={BTN_SECONDARY}>
              홈으로
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
