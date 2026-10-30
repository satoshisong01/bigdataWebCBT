'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SITE_UPDATES } from '@/data/updates';
import { todayKey } from '@/lib/date';
import type { ApiResult } from '@/lib/sync/protocol';
import {
  buildFeed,
  getSeenIds,
  markSeen,
  NOTICES_API,
  unseenIds,
  type FeedItem,
  type OfficialNotice,
} from '@/lib/updates';

const noopSubscribe = () => () => {};

function readSeen(): ReadonlySet<string> {
  return typeof window === 'undefined' ? new Set() : getSeenIds();
}

type NoticeState = 'loading' | 'ok' | 'error';

/**
 * 🔔 with an unread badge. The panel merges 사이트 업데이트 (src/data/updates.ts) with official
 * 데이터자격검정 notices (/api/notices), newest first; opening it marks everything read on this device.
 */
export default function UpdatesBell() {
  // Same hydration guard as ThemeToggle: placeholder until mounted, so localStorage can be read in a lazy initializer.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [seen, setSeen] = useState<ReadonlySet<string>>(readSeen);
  const [notices, setNotices] = useState<OfficialNotice[]>([]);
  const [noticeState, setNoticeState] = useState<NoticeState>('loading');
  const [open, setOpen] = useState(false);
  // ids that were unread when the panel was opened — highlighted as NEW while it stays open
  const [fresh, setFresh] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(NOTICES_API)
      .then(r => r.json() as Promise<ApiResult<OfficialNotice[]>>)
      .then(res => {
        if (!alive) return;
        if (res.ok) setNotices(res.data);
        setNoticeState(res.ok ? 'ok' : 'error');
      })
      .catch(() => {
        if (alive) setNoticeState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

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

  const feed = buildFeed(SITE_UPDATES, notices);
  const unseen = unseenIds(feed, seen, todayKey());

  const toggle = () => {
    if (!open) {
      const ids = feed.map(f => f.id);
      setFresh(unseen);
      setSeen(new Set([...seen, ...ids]));
      markSeen(ids);
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
          <ol className="divide-y divide-gray-100 dark:divide-slate-800">
            {feed.map(item => (
              <FeedRow key={item.id} item={item} isNew={fresh.includes(item.id)} />
            ))}
          </ol>
          <p className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
            {noticeState === 'error'
              ? '공식 공지를 지금은 불러오지 못했어요. 잠시 후 다시 열어 보세요.'
              : '공식 공지는 데이터자격검정(dataq.or.kr) 공지사항에서 빅데이터분석기사 관련 글만 자동으로 가져와요.'}
          </p>
        </div>
      )}
    </div>
  );
}

function FeedRow({ item, isNew }: { item: FeedItem; isNew: boolean }) {
  return (
    <li className="px-4 py-3 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <time dateTime={item.date} className="text-xs text-gray-500 dark:text-slate-400">
          {item.date.replaceAll('-', '.')}
        </time>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            item.kind === 'official'
              ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
          }`}
        >
          {item.kind === 'official' ? '공식 공지' : '사이트 업데이트'}
        </span>
        {isNew && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            NEW
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.title}</p>
      {item.kind === 'site' ? (
        <ul className="list-disc pl-5 space-y-1 text-[13px] leading-relaxed text-gray-700 dark:text-slate-300">
          {item.items.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <>
          {item.summary && (
            <p className="text-[13px] leading-relaxed text-gray-700 dark:text-slate-300">{item.summary}</p>
          )}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            원문 보기 ↗
          </a>
        </>
      )}
    </li>
  );
}
