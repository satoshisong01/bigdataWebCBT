'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import HomeHeader from '@/components/home/HomeHeader';
import { ChunkLoadError, SectionsSkeleton } from '@/components/home/LoadStates';

// Everything below the header comes from localStorage, so it renders on the client only.
const HomeHub = dynamic(() => import('@/components/home/HomeHub').catch(() => ChunkLoadError), {
  ssr: false,
  loading: () => <SectionsSkeleton />,
});

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <HomeHeader />
      <Suspense fallback={<SectionsSkeleton />}>
        <HomeHub />
      </Suspense>
    </div>
  );
}
