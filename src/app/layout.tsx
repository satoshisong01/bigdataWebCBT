import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '빅데이터분석기사 필기 CBT',
  description: '빅데이터분석기사 필기시험 기출문제 CBT 모의고사 - 과목별, 회차별 풀이 및 해설',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    try {
      var s = localStorage.getItem('bigdata-cbt-theme');
      var d = s ? s === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (d) document.documentElement.classList.add('dark');
    } catch (e) {}
  `;
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
