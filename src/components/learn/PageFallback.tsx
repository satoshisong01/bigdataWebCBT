'use client';

import PageHeader from '@/components/PageHeader';
import { LoadingBlock } from './StatusBlocks';
import { MAIN, PAGE } from './ui';

interface PageFallbackProps {
  title: string;
}

/** Shown while a learning page's client-only chunk loads. */
export default function PageFallback({ title }: PageFallbackProps) {
  return (
    <div className={PAGE}>
      <PageHeader title={title} />
      <main className={MAIN}>
        <LoadingBlock />
      </main>
    </div>
  );
}
