'use client';

import { useEffect } from 'react';

export interface UseExamKeyboardArgs {
  active: boolean;
  /** false once the current answer is locked (확인/submitted) */
  acceptAnswerKeys: boolean;
  optionCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** 1-based DISPLAY position (what the learner sees), not the original option number */
  onAnswerKey: (displayOption: number) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** ←/↑ previous, →/↓ next, 1–9 pick the option at that screen position. */
export function useExamKeyboard({
  active,
  acceptAnswerKeys,
  optionCount,
  onPrev,
  onNext,
  onAnswerKey,
}: UseExamKeyboardArgs): void {
  useEffect(() => {
    if (!active) return;
    const handle = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || isTypingTarget(e.target)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        onNext();
      } else if (acceptAnswerKeys && /^[1-9]$/.test(e.key)) {
        const option = Number(e.key);
        if (option <= optionCount) onAnswerKey(option);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [active, acceptAnswerKeys, optionCount, onPrev, onNext, onAnswerKey]);
}
