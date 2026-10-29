'use client';

import { useEffect, useRef, useState } from 'react';

export interface UseExamTimerArgs {
  active: boolean;
  /** seconds */
  timeLimit: number;
  onTimeout: () => void;
}

export interface ExamTimerResult {
  timeElapsed: number;
  timeRemaining: number;
}

/**
 * Wall-clock countdown: stays correct when a background tab throttles intervals.
 * Starts the first time it becomes active (remount the owner to start over).
 */
export function useExamTimer({ active, timeLimit, onTimeout }: UseExamTimerArgs): ExamTimerResult {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const onTimeoutRef = useRef(onTimeout);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!active) return;
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const startedAt = startedAtRef.current;
    let timedOut = false;
    const tick = () => {
      const elapsed = Math.min(timeLimit, Math.floor((Date.now() - startedAt) / 1000));
      setTimeElapsed(elapsed);
      if (elapsed >= timeLimit && !timedOut) {
        timedOut = true;
        onTimeoutRef.current();
      }
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, timeLimit]);

  return {
    timeElapsed,
    timeRemaining: Math.max(0, timeLimit - timeElapsed),
  };
}
