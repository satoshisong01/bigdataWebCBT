'use client';

import { useEffect, useRef, useState } from 'react';

export interface UseExamTimerArgs {
  active: boolean;
  timeLimit: number;
  onTimeout: () => void;
}

export interface ExamTimerResult {
  timeElapsed: number;
  timeRemaining: number;
}

export function useExamTimer({ active, timeLimit, onTimeout }: UseExamTimerArgs): ExamTimerResult {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const next = prev + 1;
        if (next >= timeLimit) {
          onTimeoutRef.current?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, timeLimit]);

  return {
    timeElapsed,
    timeRemaining: Math.max(0, timeLimit - timeElapsed),
  };
}

export function useTimerReset(deps: ReadonlyArray<unknown>): number {
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    setResetKey(k => k + 1);
  }, deps);
  return resetKey;
}
