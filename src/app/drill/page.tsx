'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PageFallback from '@/components/learn/PageFallback';

const DrillContent = dynamic(() => import('@/components/learn/drill/DrillContent'), {
  ssr: false,
  loading: () => <PageFallback title="계산 드릴" />,
});

export default function DrillPage() {
  return (
    <Suspense fallback={<PageFallback title="계산 드릴" />}>
      <DrillContent />
    </Suspense>
  );
}
