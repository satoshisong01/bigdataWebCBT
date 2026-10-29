/** Shared Tailwind class strings for the learning pages (spec §4 공통 스타일). */
import type { Tone } from './format';

export const PAGE = 'min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100';
export const CONTAINER = 'max-w-5xl mx-auto px-4 sm:px-6';
export const MAIN = `${CONTAINER} py-4 sm:py-6 space-y-4`;
export const CARD = 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6';
export const MUTED = 'text-gray-500 dark:text-slate-400';

const BTN =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_PRIMARY = `${BTN} bg-blue-600 dark:bg-blue-600 text-white dark:text-white hover:bg-blue-700 dark:hover:bg-blue-500 active:bg-blue-800 dark:active:bg-blue-700`;
export const BTN_SECONDARY = `${BTN} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700`;
export const BTN_GHOST =
  'text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:underline underline-offset-2';
export const LINK = 'text-blue-600 dark:text-blue-400 hover:underline underline-offset-2';

export const TONE_TEXT: Readonly<Record<Tone, string>> = {
  none: 'text-gray-400 dark:text-slate-500',
  good: 'text-green-600 dark:text-green-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
};

export const TONE_CHIP: Readonly<Record<Tone, string>> = {
  none: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
  good: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300',
  warn: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  bad: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
};

export const TONE_PANEL: Readonly<Record<Tone, string>> = {
  none: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800',
  good: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
  warn: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  bad: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
};
