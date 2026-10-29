'use client';

import type { ReactNode } from 'react';
import { BTN_SECONDARY, CARD, MUTED } from './ui';

interface LoadingBlockProps {
  label?: string;
}

export function LoadingBlock({ label = '불러오는 중…' }: LoadingBlockProps) {
  return (
    <div role="status" className={`${CARD} flex items-center justify-center gap-3 text-sm ${MUTED}`}>
      <span
        aria-hidden
        className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-slate-600 border-t-blue-600 dark:border-t-blue-400 animate-spin"
      />
      {label}
    </div>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 sm:p-6 space-y-3"
    >
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={BTN_SECONDARY}>
          다시 시도
        </button>
      )}
    </div>
  );
}

interface EmptyBlockProps {
  title: string;
  description?: string;
  /** action links/buttons */
  children?: ReactNode;
}

export function EmptyBlock({ title, description, children }: EmptyBlockProps) {
  return (
    <div className={`${CARD} text-center space-y-2`}>
      <p className="font-bold text-gray-800 dark:text-slate-100">{title}</p>
      {description && <p className={`text-sm leading-relaxed ${MUTED}`}>{description}</p>}
      {children && <div className="pt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export const CONCEPTS_LOAD_ERROR = '개념 카드를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
