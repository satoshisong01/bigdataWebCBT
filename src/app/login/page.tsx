'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ChunkLoadError, PageLoading } from '@/components/home/LoadStates';

// The form pre-fills the saved username and checks the login state (localStorage): client only.
const LoginContent = dynamic(() => import('./_components/LoginContent').catch(() => ChunkLoadError), {
  ssr: false,
  loading: () => <PageLoading title="로그인" />,
});

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading title="로그인" />}>
      <LoginContent />
    </Suspense>
  );
}
