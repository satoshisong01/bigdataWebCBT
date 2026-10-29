'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ChunkLoadError, PageLoading } from '@/components/home/LoadStates';

// The plan is computed from settings in localStorage, so it renders on the client only.
const PlanContent = dynamic(() => import('./_components/PlanContent').catch(() => ChunkLoadError), {
  ssr: false,
  loading: () => <PageLoading title="학습 플랜" />,
});

export default function PlanPage() {
  return (
    <Suspense fallback={<PageLoading title="학습 플랜" />}>
      <PlanContent />
    </Suspense>
  );
}
