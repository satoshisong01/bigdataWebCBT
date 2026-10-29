'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PageFallback from '@/components/learn/PageFallback';

const ConceptsContent = dynamic(() => import('@/components/learn/concepts/ConceptsContent'), {
  ssr: false,
  loading: () => <PageFallback title="개념 학습" />,
});

export default function ConceptsPage() {
  return (
    <Suspense fallback={<PageFallback title="개념 학습" />}>
      <ConceptsContent />
    </Suspense>
  );
}
