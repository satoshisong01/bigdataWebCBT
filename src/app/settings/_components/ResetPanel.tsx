'use client';

import { useState } from 'react';
import { logout } from '@/lib/auth';
import { useSyncStatus } from '@/components/home/syncStatus';
import { readResetCounts, runReset } from './resetActions';
import type { ResetCounts, ResetKind } from './resetActions';
import StatusMessage from './StatusMessage';
import type { Status } from './StatusMessage';

interface ResetPanelProps {
  /** called after a reset so the page re-reads its data (전체 also resets the settings) */
  onReset: () => void;
}

interface ResetItem {
  kind: ResetKind;
  title: string;
  desc: (c: ResetCounts) => string;
  confirm: string;
  done: string;
}

const ITEMS: readonly ResetItem[] = [
  {
    kind: 'history',
    title: '풀이 기록',
    desc: c => `회차·과목별 점수, 저장된 답안, 회차별 오답 다시풀기 목록 (기록 ${c.history}개)`,
    confirm: '회차·과목별 점수와 저장된 답안, 오답 다시풀기 목록을 지울까요? 복습 덱과 학습 통계는 남아요.',
    done: '풀이 기록을 지웠어요.',
  },
  {
    kind: 'questions',
    title: '복습 덱 · 문항 통계',
    desc: c => `문항별 정답률·첫 풀이 기록과 복습 덱 (문항 ${c.questions}개 · 복습 덱 ${c.deck}개)`,
    confirm: '문항 통계와 복습 덱(오답노트)을 모두 지울까요? 합격 준비도와 히트맵이 처음부터 다시 계산돼요.',
    done: '복습 덱과 문항 통계를 지웠어요.',
  },
  {
    kind: 'concepts',
    title: '개념 학습 기록',
    desc: c => `개념 카드·용어 퀴즈 학습 기록과 카드 복습 일정 (카드 ${c.concepts}장)`,
    confirm: '개념 카드 학습 기록과 복습 일정을 모두 지울까요?',
    done: '개념 학습 기록을 지웠어요.',
  },
  {
    kind: 'all',
    title: '전체 초기화',
    desc: () => '설정·북마크·모의고사 기록·학습 활동까지 이 앱의 모든 데이터 (화면 테마만 유지)',
    confirm: '이 앱의 모든 학습 데이터와 설정을 지울까요? 되돌릴 수 없어요. 먼저 백업을 내보내 두는 것을 권해요.',
    done: '모든 데이터를 지웠어요.',
  },
];

/** Logged in: partial resets reach the account (other devices too); 전체 logs this device out first. */
const SYNCED_RESET_NOTE = '로그인 중이라 지운 기록은 계정에도 반영돼 다른 기기에서도 지워져요.';
const SYNCED_RESET_ALL_NOTE =
  '로그인 중이라 먼저 로그아웃한 뒤 이 기기만 비워요. 계정에 동기화된 기록은 남아 있어 다시 로그인하면 불러와요(아직 동기화되지 않은 변경은 함께 지워져요).';

function confirmText(item: ResetItem, loggedIn: boolean): string {
  if (!loggedIn) return item.confirm;
  return `${item.confirm}\n\n${item.kind === 'all' ? SYNCED_RESET_ALL_NOTE : SYNCED_RESET_NOTE}`;
}

/** 초기화 — each reset asks for confirmation first. */
export default function ResetPanel({ onReset }: ResetPanelProps) {
  const [counts, setCounts] = useState<ResetCounts>(readResetCounts);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const { loggedIn } = useSyncStatus().status;

  const handleReset = async (item: ResetItem) => {
    if (!window.confirm(confirmText(item, loggedIn))) return;
    setBusy(true);
    // 전체 also removes the sync meta: end the session properly (uploads pending changes) first
    // (forced: 전체 초기화 wipes this device anyway, unsent changes included — the confirm said so)
    if (item.kind === 'all' && loggedIn) await logout({ force: true });
    setBusy(false);
    const ok = runReset(item.kind);
    setCounts(readResetCounts());
    setStatus(ok ? { tone: 'ok', text: item.done } : { tone: 'error', text: '브라우저 저장소에 접근하지 못해 초기화하지 못했어요.' });
    onReset();
  };

  return (
    <section
      className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/60 p-4 sm:p-6"
      aria-labelledby="reset-title"
    >
      <h2 id="reset-title" className="text-base sm:text-lg font-bold text-red-700 dark:text-red-400">
        초기화
      </h2>
      {loggedIn && (
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          로그인 중에는 풀이 기록·복습 덱·개념 기록 초기화가 계정과 다른 기기에도 반영돼요. 전체 초기화는 먼저 로그아웃하고 이
          기기만 비워요.
        </p>
      )}
      <ul className="mt-2 divide-y divide-gray-100 dark:divide-slate-800">
        {ITEMS.map(item => (
          <li key={item.kind} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc(counts)}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleReset(item)}
              disabled={busy}
              className={`flex-shrink-0 min-h-10 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border transition disabled:opacity-60 ${
                item.kind === 'all'
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500'
                  : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40'
              }`}
            >
              초기화
            </button>
          </li>
        ))}
      </ul>
      <StatusMessage status={status} />
    </section>
  );
}
