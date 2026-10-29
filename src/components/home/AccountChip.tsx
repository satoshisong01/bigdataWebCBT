'use client';

import Link from 'next/link';
import { syncChipLabel, useSyncStatus } from './syncStatus';

const CHIP =
  'inline-flex items-center gap-1.5 min-h-10 max-w-full px-3 rounded-lg border text-xs sm:text-sm font-medium transition';

/**
 * Home header account control (docs §7.6), client-only because it reads the sync meta:
 * logged out → '로그인'; logged in → '아이디 · ☁ n분 전 동기화' (⚠ on error) linking to /settings.
 */
export default function AccountChip() {
  const { status, now } = useSyncStatus();

  if (!status.loggedIn) {
    return (
      <Link
        href="/login"
        className={`${CHIP} justify-center font-bold border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400`}
      >
        로그인
      </Link>
    );
  }

  const label = syncChipLabel(status, now);
  const tone = status.lastError
    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70'
    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
  return (
    <Link
      href="/settings"
      title={status.lastError ? `동기화 오류: ${status.lastError}` : '계정·동기화 설정'}
      aria-label={`${status.username ?? ''} 계정 · ${label}${status.lastError ? ' (오류)' : ''} — 계정·동기화 설정`}
      className={`${CHIP} ${tone}`}
    >
      <span className="truncate max-w-[9rem] sm:max-w-[12rem] font-bold">{status.username}</span>
      <span aria-hidden className="text-gray-400 dark:text-slate-500">·</span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
