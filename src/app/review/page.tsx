'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PageFallback from '@/components/learn/PageFallback';

const ReviewContent = dynamic(() => import('@/components/learn/review/ReviewContent'), {
  ssr: false,
  loading: () => <PageFallback title="오늘의 복습" />,
});

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageFallback title="오늘의 복습" />}>
      <ReviewContent />
    </Suspense>
  );
}
