'use client';

import { useEffect, useState } from 'react';
import { SYNC_STATUS_EVENT } from '@/lib/sync/events';
import { getSyncStatus } from '@/lib/sync/engine';
import type { SyncResult, SyncStatus } from '@/lib/sync/events';

const MINUTE_MS = 60_000;
/** how often the "n분 전" text is refreshed while nothing else changes */
const TICK_MS = 30_000;

/** '방금' / 'n분 전' / 'n시간 전' / 'n일 전'; '' when never synced or the time is unreadable. */
export function syncAgoLabel(lastSyncAt: string | undefined, now: number): string {
  const at = lastSyncAt ? Date.parse(lastSyncAt) : NaN;
  if (Number.isNaN(at)) return '';
  const minutes = Math.max(0, Math.floor((now - at) / MINUTE_MS));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/** Header chip text after the username: '☁ 3분 전 동기화', '⚠ …' on error, '동기화 중…' while running. */
export function syncChipLabel(status: Pick<SyncStatus, 'syncing' | 'lastSyncAt' | 'lastError'>, now: number): string {
  if (status.syncing) return '☁ 동기화 중…';
  const icon = status.lastError ? '⚠' : '☁';
  const ago = syncAgoLabel(status.lastSyncAt, now);
  return ago ? `${icon} ${ago} 동기화` : `${icon} 동기화 전`;
}

/** Korean result line for a manual '지금 동기화'. */
export function syncResultMessage(result: SyncResult): { tone: 'ok' | 'error'; text: string } {
  switch (result.status) {
    case 'ok':
      return {
        tone: 'ok',
        text: result.applied > 0 ? `동기화했어요. 다른 기기 기록 ${result.applied}건을 불러왔어요.` : '동기화했어요.',
      };
    case 'skipped':
      if (result.reason === 'offline') return { tone: 'error', text: '오프라인이라 동기화하지 못했어요. 연결되면 자동으로 다시 시도해요.' };
      if (result.reason === 'busy') return { tone: 'ok', text: '이미 동기화 중이에요.' };
      return { tone: 'error', text: '로그인한 뒤에 동기화할 수 있어요.' };
    case 'unauthorized':
    case 'error':
      return { tone: 'error', text: result.error };
  }
}

export interface SyncStatusSnapshot {
  status: SyncStatus;
  /** Date.now() of the last re-read, for relative times */
  now: number;
}

function readSnapshot(): SyncStatusSnapshot {
  return { status: getSyncStatus(), now: Date.now() };
}

/** Live sync/auth status for client-only UI (reads localStorage): re-read on status events and every 30s. */
export function useSyncStatus(): SyncStatusSnapshot {
  const [snapshot, setSnapshot] = useState<SyncStatusSnapshot>(readSnapshot);
  useEffect(() => {
    const refresh = (): void => setSnapshot(readSnapshot());
    window.addEventListener(SYNC_STATUS_EVENT, refresh);
    const timer = setInterval(refresh, TICK_MS);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, refresh);
      clearInterval(timer);
    };
  }, []);
  return snapshot;
}
