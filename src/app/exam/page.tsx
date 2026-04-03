import { Suspense } from 'react';
import ExamView from '@/components/ExamView';

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      }
    >
      <ExamView />
    </Suspense>
  );
}
