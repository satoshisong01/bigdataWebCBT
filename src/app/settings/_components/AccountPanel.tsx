'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout, syncNow } from '@/lib/auth';
import { syncAgoLabel, syncResultMessage, useSyncStatus } from '@/components/home/syncStatus';
import PasswordForm from './PasswordForm';
import StatusMessage from './StatusMessage';
import type { Status } from './StatusMessage';

const CARD = 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6';
const TITLE = 'text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100';
const HINT = 'text-xs sm:text-sm text-gray-500 dark:text-slate-400';
const BTN = 'min-h-10 px-4 inline-flex items-center justify-center text-sm font-bold rounded-lg transition disabled:opacity-60';
const BTN_PRIMARY = `${BTN} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400`;
const BTN_SECONDARY = `${BTN} border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800`;

function formatSyncTime(iso: string | undefined, now: number): string {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '아직 없음';
  const clock = at.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${syncAgoLabel(iso, now)} (${clock})`;
}

/** 설정 '계정·동기화' (docs §7.6): login link, or status + 지금 동기화 · 비밀번호 변경 · 로그아웃. */
export default function AccountPanel() {
  const { status, now } = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<Status | null>(null);

  const runSync = async () => {
    setBusy(true);
    setMessage(null);
    const result = await syncNow();
    setBusy(false);
    setMessage(syncResultMessage(result));
  };

  const runLogout = async () => {
    if (!window.confirm('로그아웃할까요? 이 기기의 학습 기록은 그대로 남아요.')) return;
    setBusy(true);
    setMessage(null);
    const first = await logout();
    const discard = !first.ok && window.confirm(
      `아직 서버에 올라가지 않은 변경 ${first.unsynced}건이 있어요(오프라인이거나 동기화 실패). 지금 로그아웃하면 이 변경은 계정에 반영되지 않아요. 그래도 로그아웃할까요?`,
    );
    const result = discard ? await logout({ force: true }) : first;
    setBusy(false);
    if (!result.ok) {
      setMessage({ tone: 'error', text: '로그아웃하지 않았어요. 연결을 확인하고 지금 동기화한 뒤 다시 시도해 주세요.' });
      return;
    }
    setShowPassword(false);
    setMessage({ tone: 'ok', text: '로그아웃했어요. 이 기기의 학습 기록은 그대로 남아 있어요.' });
  };

  const passwordDone = (done: Status) => {
    setShowPassword(false);
    setMessage(done);
  };

  return (
    <section className={CARD} aria-labelledby="account-title">
      <h2 id="account-title" className={TITLE}>
        계정·동기화
      </h2>
      {!status.loggedIn ? (
        <>
          <p className={`mt-1 ${HINT}`}>
            로그인하면 오답노트·복습 일정·풀이 기록·북마크·설정이 PC와 휴대폰에서 이어져요. 로그인하지 않아도 이 기기에서는
            그대로 쓸 수 있어요.
          </p>
          <Link href="/login?next=%2Fsettings" className={`mt-3 ${BTN_PRIMARY}`}>
            로그인
          </Link>
        </>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-gray-500 dark:text-slate-400">아이디</dt>
            <dd className="font-bold text-gray-900 dark:text-slate-100 break-all">{status.username}</dd>
            <dt className="text-gray-500 dark:text-slate-400">마지막 동기화</dt>
            <dd className="text-gray-800 dark:text-slate-100 tabular-nums">
              {status.syncing ? '동기화 중…' : formatSyncTime(status.lastSyncAt, now)}
            </dd>
            <dt className="text-gray-500 dark:text-slate-400">대기 중 변경</dt>
            <dd className="text-gray-800 dark:text-slate-100 tabular-nums">{status.pending}건</dd>
            {status.lastError && (
              <>
                <dt className="text-red-600 dark:text-red-400">오류</dt>
                <dd className="text-red-600 dark:text-red-400 break-words">⚠ {status.lastError}</dd>
              </>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={runSync} disabled={busy || status.syncing} className={BTN_PRIMARY}>
              {status.syncing ? '동기화 중…' : '지금 동기화'}
            </button>
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-expanded={showPassword}
              disabled={busy}
              className={BTN_SECONDARY}
            >
              비밀번호 변경
            </button>
            <button
              type="button"
              onClick={runLogout}
              disabled={busy}
              className={`${BTN} border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40`}
            >
              로그아웃
            </button>
          </div>
          {showPassword && (
            <PasswordForm
              username={status.username ?? ''}
              onDone={passwordDone}
              onCancel={() => setShowPassword(false)}
            />
          )}
        </>
      )}
      <StatusMessage status={message} />
    </section>
  );
}
