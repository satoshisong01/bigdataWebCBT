'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { startAutoSync } from '@/lib/sync/engine';
import { SYNC_EVENT, type SyncEventDetail } from '@/lib/sync/events';

interface SyncProviderProps {
  /** optional — the provider can wrap the app or sit next to it */
  children?: ReactNode;
}

const TOAST_MS = 5_000;

function appliedCount(event: Event): number {
  const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
  const applied = (detail as Partial<SyncEventDetail> | null | undefined)?.applied;
  return typeof applied === 'number' ? applied : 0;
}

/**
 * Runs automatic sync while logged in (the triggers check the login state themselves, so a later
 * login on /login needs no remount) and briefly says when another device's records arrived.
 */
export default function SyncProvider({ children }: SyncProviderProps) {
  /** null = hidden; a new number per event restarts the auto-hide timer */
  const [toast, setToast] = useState<number | null>(null);

  useEffect(() => startAutoSync(), []);

  useEffect(() => {
    const onSynced = (event: Event): void => {
      if (appliedCount(event) > 0) setToast(n => (n ?? 0) + 1);
    };
    window.addEventListener(SYNC_EVENT, onSynced);
    return () => window.removeEventListener(SYNC_EVENT, onSynced);
  }, []);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {children}
      {toast !== null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <span aria-hidden="true" className="text-blue-500 dark:text-blue-400">☁</span>
            <p className="flex-1">다른 기기의 학습 기록을 불러왔어요</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="안내 닫기"
              className="-m-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export { SyncProvider };
