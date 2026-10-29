'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SITE_UPDATES } from '@/data/updates';
import { getSeenUpdateId, markUpdatesSeen, unseenUpdateIds } from '@/lib/updates';

const noopSubscribe = () => () => {};

function readUnseen(): string[] {
  if (typeof window === 'undefined') return [];
  return unseenUpdateIds(SITE_UPDATES, getSeenUpdateId());
}

/** 🔔 with an unread badge; opening the panel lists 업데이트 내역 (newest first) and marks them read on this device. */
export default function UpdatesBell() {
  // Same hydration guard as ThemeToggle: placeholder until mounted, so localStorage can be read in a lazy initializer.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [unseen, setUnseen] = useState<string[]>(readUnseen);
  const [open, setOpen] = useState(false);
  // ids that were unread when the panel was opened — highlighted as NEW while it stays open
  const [fresh, setFresh] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  const toggle = () => {
    if (!open) {
      setFresh(unseen);
      setUnseen([]);
      markUpdatesSeen(SITE_UPDATES);
    }
    setOpen(!open);
  };

  const count = unseen.length;
  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `업데이트 소식, 새 소식 ${count}개` : '업데이트 소식'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="업데이트 소식"
        className="relative w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition flex items-center justify-center text-base"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold leading-5 text-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="업데이트 내역"
          className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 z-30 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg text-left"
        >
          <p className="sticky top-0 px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-slate-100">
            업데이트 내역
          </p>
          {SITE_UPDATES.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400">아직 업데이트 소식이 없어요.</p>
          ) : (
            <ol className="divide-y divide-gray-100 dark:divide-slate-800">
              {SITE_UPDATES.map(u => (
                <li key={u.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <time dateTime={u.date} className="text-xs text-gray-500 dark:text-slate-400">
                      {u.date.replaceAll('-', '.')}
                    </time>
                    {fresh.includes(u.id) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{u.title}</p>
                  <ul className="list-disc pl-5 space-y-1 text-[13px] leading-relaxed text-gray-700 dark:text-slate-300">
                    {u.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
