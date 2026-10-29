'use client';

import Link from 'next/link';

interface FeatureTilesProps {
  /** due questions + due cards */
  dueCount: number;
  /** questions in the review deck (오답노트) */
  deckCount: number;
  bookmarkCount: number;
}

interface Tile {
  href: string;
  icon: string;
  label: string;
  desc: string;
  /** red badge (things to do today) */
  badge?: number;
  /** quiet count (things collected) */
  count?: number;
}

function tilesFor({ dueCount, deckCount, bookmarkCount }: FeatureTilesProps): Tile[] {
  return [
    { href: '/concepts', icon: '📘', label: '개념 학습', desc: '출제기준 세세항목별 카드' },
    { href: '/concepts?quiz=1', icon: '🔤', label: '용어 퀴즈', desc: '설명 보고 용어 맞히기' },
    { href: '/review', icon: '🔁', label: '오늘의 복습', desc: '간격 반복 문제·카드', badge: dueCount },
    { href: '/drill', icon: '🧮', label: '계산 드릴', desc: '계산기 없이 빠르게' },
    { href: '/exam?pool=weak', icon: '🎯', label: '약점 집중', desc: '정답률 낮은 세세항목' },
    { href: '/exam?pool=mock&strict=1', icon: '⏱', label: '실전 모의고사', desc: '80문항 · 120분 · 해설 없음' },
    { href: '/exam?pool=wrong-pool', icon: '📕', label: '오답노트', desc: '복습 덱 전체', count: deckCount },
    { href: '/exam?pool=bookmarks', icon: '★', label: '북마크', desc: '☆ 표시한 문제', count: bookmarkCount },
    { href: '/guide', icon: '🧭', label: '합격 전략', desc: '2026 출제 경향·공부법' },
  ];
}

/** 학습 메뉴 — 3×3 grid of entry points; 오늘의 복습 carries today's due badge. */
export default function FeatureTiles(props: FeatureTilesProps) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-slate-100 mb-3 sm:mb-4">학습 메뉴</h2>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {tilesFor(props).map(tile => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="relative flex h-full flex-col items-center sm:items-start gap-1 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-slate-800 transition text-center sm:text-left"
            >
              <span className="text-xl sm:text-2xl leading-none" aria-hidden>
                {tile.icon}
              </span>
              <span className="text-xs sm:text-base font-bold text-gray-800 dark:text-slate-100 break-keep">
                {tile.label}
                {tile.count !== undefined && tile.count > 0 && (
                  <span className="ml-1 text-[11px] sm:text-xs font-medium text-gray-400 dark:text-slate-500 tabular-nums">
                    {tile.count}
                  </span>
                )}
              </span>
              <span className="hidden sm:block text-xs text-gray-500 dark:text-slate-400">{tile.desc}</span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <>
                  <span
                    className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 min-w-5 h-5 px-1.5 rounded-full bg-red-500 dark:bg-red-600 text-white text-[11px] font-bold leading-5 text-center tabular-nums"
                    aria-hidden
                  >
                    {tile.badge > 99 ? '99+' : tile.badge}
                  </span>
                  <span className="sr-only">오늘 복습 {tile.badge}개</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
