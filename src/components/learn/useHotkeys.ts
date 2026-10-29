'use client';

import { useEffect, useEffectEvent } from 'react';

/** Text fields where typed keys must never trigger shortcuts. */
export function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
}

/** Targets where Space/Enter already act natively (typing, or activating an enabled button/link). */
export function isActivationTarget(target: EventTarget | null): boolean {
  if (isTextTarget(target)) return true;
  if (target instanceof HTMLButtonElement) return !target.disabled;
  return target instanceof HTMLAnchorElement;
}

/** Window keydown listener that skips IME composition, key repeat and modifier chords. */
export function useHotkeys(onKey: (e: KeyboardEvent) => void, enabled: boolean = true): void {
  const handle = useEffectEvent((e: KeyboardEvent) => onKey(e));

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      handle(e);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}

interface ChoiceHotkeys {
  optionCount: number;
  answered: boolean;
  onPick: (option: number) => void;
  onNext: () => void;
  enabled?: boolean;
}

/** 1–9 pick a (screen-position) option until answered; Enter/Space move on afterwards. */
export function useChoiceHotkeys({ optionCount, answered, onPick, onNext, enabled = true }: ChoiceHotkeys): void {
  useHotkeys(e => {
    if (/^[1-9]$/.test(e.key)) {
      const option = Number(e.key);
      if (!answered && option <= optionCount && !isTextTarget(e.target)) {
        e.preventDefault();
        onPick(option);
      }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && answered && !isActivationTarget(e.target)) {
      e.preventDefault();
      onNext();
    }
  }, enabled);
}
