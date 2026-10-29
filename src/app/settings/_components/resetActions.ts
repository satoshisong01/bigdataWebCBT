import { STORAGE_PREFIX } from '@/lib/backup';
import { clearCStats, clearQStats, getCStats, getDeckQuestionIds, getQStats } from '@/lib/stats';
import { clearAllWrongStats, getHistory } from '@/lib/storage';

const THEME_KEY = 'bigdata-cbt-theme';

/** Legacy per-exam records: scores, saved answers, 오답 다시풀기 lists and retry contexts. */
export const HISTORY_KEYS: readonly string[] = [
  'bigdata-cbt-history',
  'bigdata-cbt-answers',
  'bigdata-cbt-wrong',
  'bigdata-cbt-retry-ctx',
];

export type ResetKind = 'history' | 'questions' | 'concepts' | 'all';

/** Every 'bigdata-cbt-*' key except the theme. */
export function resettableKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
    (k): k is string => k !== null && k.startsWith(STORAGE_PREFIX) && k !== THEME_KEY,
  );
}

function removeKeys(keys: readonly string[]): void {
  keys.forEach(k => localStorage.removeItem(k));
}

/**
 * - history:   풀이 기록 (HISTORY_KEYS)
 * - questions: 복습 덱·문항 통계 (QStats + the legacy global wrong-stats)
 * - concepts:  개념 학습 기록 (CStats)
 * - all:       every 'bigdata-cbt-*' key except the theme
 * Returns false when storage could not be written.
 */
export function runReset(kind: ResetKind): boolean {
  try {
    if (kind === 'history') removeKeys(HISTORY_KEYS);
    if (kind === 'questions') {
      clearQStats();
      clearAllWrongStats();
    }
    if (kind === 'concepts') clearCStats();
    if (kind === 'all') removeKeys(resettableKeys());
    return true;
  } catch {
    return false;
  }
}

export interface ResetCounts {
  /** exam records in 풀이 기록 */
  history: number;
  /** questions with stats */
  questions: number;
  /** of which in the review deck */
  deck: number;
  /** concept cards with stats */
  concepts: number;
}

export function readResetCounts(): ResetCounts {
  const history: unknown = getHistory();
  return {
    history: Array.isArray(history) ? history.length : 0,
    questions: Object.keys(getQStats()).length,
    deck: getDeckQuestionIds().length,
    concepts: Object.keys(getCStats()).length,
  };
}
