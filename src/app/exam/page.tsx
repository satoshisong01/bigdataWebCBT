'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ExamChunkError, ExamLoading } from '@/components/exam/ExamStatus';

// Client-only: the exam reads answers, stats and settings from localStorage on its first render.
// If the chunk cannot be fetched (offline before it was cached) show a retry screen instead of crashing.
const ExamView = dynamic(
  () => import('@/components/ExamView').catch(() => ({ default: ExamChunkError })),
  { ssr: false, loading: () => <ExamLoading /> },
);

export default function ExamPage() {
  return (
    <Suspense fallback={<ExamLoading />}>
      <ExamView />
    </Suspense>
  );
}
