import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// page.tsx is a client component, so the route's metadata lives here.
export const metadata: Metadata = {
  title: '설정 · 빅데이터분석기사 필기',
};

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
