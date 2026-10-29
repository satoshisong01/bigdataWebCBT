'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH, changePassword } from '@/lib/auth';
import type { Status } from './StatusMessage';

interface PasswordFormProps {
  /** for password managers (hidden username field) */
  username: string;
  onDone: (status: Status) => void;
  onCancel: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
}

const FIELD =
  'w-full min-h-11 px-3 py-2 text-base rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 disabled:opacity-60';
const BTN = 'min-h-10 px-4 text-sm font-bold rounded-lg transition disabled:opacity-60';

function PasswordField({ id, label, autoComplete, value, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={FIELD}
      />
    </div>
  );
}

/** Client-side checks before calling the API; null when the input is fine. */
export function passwordFormError(current: string, next: string, confirm: string): string | null {
  if (current === '') return '현재 비밀번호를 입력해 주세요.';
  if (next.length < MIN_PASSWORD_LENGTH) return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  if (next !== confirm) return '새 비밀번호와 확인이 서로 달라요.';
  if (next === current) return '현재 비밀번호와 다른 비밀번호를 입력해 주세요.';
  return null;
}

/** 비밀번호 변경 (current / new / confirm, min 6). Success ends the account's other sessions. */
export default function PasswordForm({ username, onDone, onCancel }: PasswordFormProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const invalid = passwordFormError(current, next, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError('');
    const result = await changePassword(current, next);
    setPending(false);
    if (result.ok) {
      onDone({ tone: 'ok', text: '비밀번호를 바꿨어요. 다른 기기에서는 새 비밀번호로 다시 로그인해 주세요.' });
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/40 p-3 sm:p-4"
    >
      <fieldset disabled={pending} className="space-y-3">
        <legend className="text-sm font-bold text-gray-800 dark:text-slate-100">비밀번호 변경</legend>
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <PasswordField id="pw-current" label="현재 비밀번호" autoComplete="current-password" value={current} onChange={setCurrent} />
        <PasswordField id="pw-next" label="새 비밀번호" autoComplete="new-password" value={next} onChange={setNext} />
        <PasswordField id="pw-confirm" label="새 비밀번호 확인" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {MIN_PASSWORD_LENGTH}자 이상(8자 이상 권장). 바꾸면 다른 기기는 로그아웃돼요.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className={`${BTN} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400`}
          >
            {pending ? '바꾸는 중…' : '비밀번호 바꾸기'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`${BTN} border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800`}
          >
            취소
          </button>
        </div>
      </fieldset>
    </form>
  );
}
