import { diffDays } from '@/lib/date';

/** 'yyyy-mm-dd' → '11/5' */
export function formatDayShort(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** Due day relative to today: '오늘' (also when overdue), '내일', 'n일 후'. */
export function formatDue(today: string, due: string): string {
  const n = diffDays(today, due);
  if (n <= 0) return '오늘';
  return n === 1 ? '내일' : `${n}일 후`;
}

/** Rounded 0–100; 0 when total is 0. */
export function percent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export type Tone = 'none' | 'good' | 'warn' | 'bad';

/** Mirrors the pass rules: 60+ 합격선, 40–59 과락은 면함, under 40 과락. Negative = no data. */
export function accuracyTone(pct: number): Tone {
  if (pct < 0) return 'none';
  if (pct >= 60) return 'good';
  return pct >= 40 ? 'warn' : 'bad';
}
