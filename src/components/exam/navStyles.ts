import type { NavCellState } from '@/hooks/exam/state';

interface CellStyle {
  base: string;
  current: string;
}

/** Desktop sidebar (bordered squares). */
const SIDEBAR: Readonly<Record<NavCellState, CellStyle>> = {
  idle: {
    base: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800',
    current: 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 dark:ring-blue-800',
  },
  answered: {
    base: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
    current: 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 dark:ring-blue-800',
  },
  passed: {
    base: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-800',
    current: 'bg-yellow-500 text-white border-yellow-500 ring-2 ring-yellow-300 dark:ring-yellow-800',
  },
  correct: {
    base: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800',
    current: 'bg-green-600 text-white border-green-600 ring-2 ring-green-300 dark:ring-green-800',
  },
  wrong: {
    base: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800',
    current: 'bg-red-600 text-white border-red-600 ring-2 ring-red-300 dark:ring-red-800',
  },
  skipped: {
    base: 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
    current: 'bg-red-600 text-white border-red-600 ring-2 ring-red-300 dark:ring-red-800',
  },
};

/** Mobile bottom grid (borderless). */
const GRID: Readonly<Record<NavCellState, CellStyle>> = {
  idle: { base: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300', current: 'bg-blue-600 text-white' },
  answered: { base: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', current: 'bg-blue-600 text-white' },
  passed: { base: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200', current: 'bg-yellow-500 text-white' },
  correct: { base: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200', current: 'bg-green-600 text-white' },
  wrong: { base: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', current: 'bg-red-600 text-white' },
  skipped: { base: 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500', current: 'bg-gray-500 text-white dark:bg-slate-500' },
};

export function sidebarCellClass(state: NavCellState, current: boolean): string {
  return current ? SIDEBAR[state].current : SIDEBAR[state].base;
}

export function gridCellClass(state: NavCellState, current: boolean): string {
  return current ? GRID[state].current : GRID[state].base;
}

/** Small dot marking a question flagged 헷갈림. */
export const UNSURE_DOT = 'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-white dark:ring-slate-900';
