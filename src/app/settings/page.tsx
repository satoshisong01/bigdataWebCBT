'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ChunkLoadError, PageLoading } from '@/components/home/LoadStates';

// Settings, backup and resets all work on localStorage, so the page renders on the client only.
const SettingsContent = dynamic(() => import('./_components/SettingsContent').catch(() => ChunkLoadError), {
  ssr: false,
  loading: () => <PageLoading title="설정" />,
});

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading title="설정" />}>
      <SettingsContent />
    </Suspense>
  );
}
