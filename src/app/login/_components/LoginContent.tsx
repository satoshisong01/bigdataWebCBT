'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { clearSavedUsername, getAuthState, getSavedUsername, login, setSavedUsername } from '@/lib/auth';
import { safeNextPath } from './nextPath';

const LABEL = 'block text-sm font-bold text-gray-800 dark:text-slate-100 mb-1';
// text-base (16px) keeps iOS from zooming into the field on focus
const FIELD =
  'w-full min-h-11 px-3 py-2 text-base rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 disabled:opacity-60';
const UNEXPECTED_ERROR = '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: string;
}

function Checkbox({ checked, onChange, children, hint }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2.5 min-h-10 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 flex-shrink-0 rounded accent-blue-600 dark:accent-blue-500"
      />
      <span className="text-sm text-gray-800 dark:text-slate-100">
        {children}
        {hint && <span className="block text-xs text-gray-500 dark:text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

/** /login (client-only): username + password → login → sync → `?next=` (same-origin path) or home. */
export default function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [savedUsername] = useState(getSavedUsername);
  const [current] = useState(getAuthState);
  const [username, setUsername] = useState(savedUsername);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [saveId, setSaveId] = useState(savedUsername !== '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const first = await login(username, password, remember);
      const confirmed = !first.ok && first.unsynced !== undefined && window.confirm(
        `${first.error}

그래도 이 계정으로 로그인할까요? 이전 계정으로 먼저 로그인하면 그 변경을 올릴 수 있어요.`,
      );
      const result = confirmed ? await login(username, password, remember, { discardUnsynced: true }) : first;
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (saveId) setSavedUsername(result.username);
      else clearSavedUsername();
      router.replace(safeNextPath(params.get('next'), window.location.origin));
    } catch {
      setError(UNEXPECTED_ERROR);
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <PageHeader title="로그인" subtitle="기기 간 학습 기록 동기화" />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {current.loggedIn && (
          <p className="mb-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
            지금 <span className="font-bold break-all">{current.username}</span> 계정으로 로그인되어 있어요. 다른 계정으로
            로그인하면 이 기기의 학습 기록은 새 계정의 기록으로 바뀌어요.{' '}
            <Link href="/" className="font-bold underline underline-offset-2">
              홈으로
            </Link>
          </p>
        )}
        <form
          onSubmit={submit}
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6"
        >
          <fieldset disabled={pending} className="space-y-4">
            <legend className="sr-only">계정 로그인</legend>
            <div>
              <label htmlFor="login-username" className={LABEL}>
                아이디
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="login-password" className={LABEL}>
                비밀번호
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={FIELD}
              />
            </div>
            <div className="space-y-1">
              <Checkbox checked={remember} onChange={setRemember} hint="끄면 브라우저를 닫을 때 로그아웃돼요">
                로그인 상태 유지
              </Checkbox>
              <Checkbox checked={saveId} onChange={setSaveId} hint="아이디만 이 기기에 저장해요 (비밀번호는 저장하지 않아요)">
                아이디 저장
              </Checkbox>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full min-h-11 px-4 text-base font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition disabled:opacity-60 disabled:cursor-wait"
            >
              {pending ? '로그인하고 동기화하는 중…' : '로그인'}
            </button>
          </fieldset>
        </form>
        <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
          <p>회원가입은 없어요. 미리 지정된 계정만 로그인할 수 있어요.</p>
          <p>
            로그인하지 않아도 이 기기에서는 모든 기능을 그대로 쓸 수 있어요. 로그인하면 이 기기의 학습 기록이 계정에 합쳐지고
            다른 기기와 동기화돼요.
          </p>
        </div>
      </main>
    </div>
  );
}
