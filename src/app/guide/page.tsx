import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import GuideContent from '@/components/guide/GuideContent';
import { GUIDE_SECTIONS, GUIDE_UPDATED } from '@/data/guide';

export const metadata: Metadata = {
  title: '합격 전략 · 빅데이터분석기사 필기',
  description: '2026년 빅데이터분석기사 필기 출제 경향과 2027 상반기 합격을 위한 공부 방법',
};

/** Static content only (no localStorage), so this stays a server component. */
export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <PageHeader title="합격 전략" subtitle={`2026 출제 경향과 공부법 · ${GUIDE_UPDATED} 업데이트`} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <GuideContent sections={GUIDE_SECTIONS} />
      </main>
    </div>
  );
}
