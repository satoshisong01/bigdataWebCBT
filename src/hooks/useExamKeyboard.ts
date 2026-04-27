'use client';

import { useEffect } from 'react';

export interface UseExamKeyboardArgs {
  active: boolean;
  questionCount: number;
  currentIndex: number;
  acceptAnswerKeys: boolean;
  setCurrentIndex: (updater: (prev: number) => number) => void;
  onAnswerKey: (answer: number) => void;
}

export function useExamKeyboard({
  active,
  questionCount,
  currentIndex,
  acceptAnswerKeys,
  setCurrentIndex,
  onAnswerKey,
}: UseExamKeyboardArgs): void {
  useEffect(() => {
    if (!active) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(questionCount - 1, prev + 1));
      } else if (acceptAnswerKeys && ['1', '2', '3', '4'].includes(e.key)) {
        onAnswerKey(parseInt(e.key, 10));
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [active, questionCount, acceptAnswerKeys, setCurrentIndex, onAnswerKey, currentIndex]);
}
