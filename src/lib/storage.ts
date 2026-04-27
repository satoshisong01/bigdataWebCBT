const HISTORY_KEY = 'bigdata-cbt-history';
const WRONG_KEY = 'bigdata-cbt-wrong';

export interface ExamRecord {
  key: string;
  score: number;
  passed: boolean;
  date: string;
}

export function getHistory(): ExamRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record: ExamRecord): void {
  const history = getHistory();
  const idx = history.findIndex(r => r.key === record.key);
  if (idx >= 0) {
    history[idx] = record;
  } else {
    history.push(record);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getRecord(key: string): ExamRecord | undefined {
  return getHistory().find(r => r.key === key);
}

export function saveWrongIds(key: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getWrongMap();
    all[key] = ids;
    localStorage.setItem(WRONG_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getWrongIds(key: string): string[] {
  return getWrongMap()[key] ?? [];
}

function getWrongMap(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const RETRY_CTX_KEY = 'bigdata-cbt-retry-ctx';

export interface RetryContext {
  totals: Record<number, number>;
  baseCorrect: Record<number, number>;
}

export function saveRetryContext(key: string, ctx: RetryContext): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getRetryCtxMap();
    all[key] = ctx;
    localStorage.setItem(RETRY_CTX_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getRetryContext(key: string): RetryContext | undefined {
  return getRetryCtxMap()[key];
}

export function clearRetryContext(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getRetryCtxMap();
    delete all[key];
    localStorage.setItem(RETRY_CTX_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function getRetryCtxMap(): Record<string, RetryContext> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RETRY_CTX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const ANSWERS_KEY = 'bigdata-cbt-answers';

export function saveExamAnswers(key: string, answers: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAnswersMap();
    all[key] = answers;
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getExamAnswers(key: string): Record<string, number> | undefined {
  const map = getAnswersMap();
  const saved = map[key];
  return saved && Object.keys(saved).length > 0 ? saved : undefined;
}

export function clearExamAnswers(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAnswersMap();
    delete all[key];
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function getAnswersMap(): Record<string, Record<string, number>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getAllExamAnswers(): Record<string, Record<string, number>> {
  return getAnswersMap();
}

const BOOKMARKS_KEY = 'bigdata-cbt-bookmarks';
const WRONG_STATS_KEY = 'bigdata-cbt-wrong-stats';

export function getBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(qId: string): boolean {
  return getBookmarks().includes(qId);
}

export function toggleBookmark(qId: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getBookmarks();
  const idx = list.indexOf(qId);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    return false;
  }
  list.push(qId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  return true;
}

export interface WrongStat {
  wrongCount: number;
  lastWrongAt: string;
  graduated: boolean;
}

export function getWrongStats(): Record<string, WrongStat> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WRONG_STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWrongStats(stats: Record<string, WrongStat>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WRONG_STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function recordWrongAnswers(wrongIds: readonly string[], allAttemptedIds: readonly string[]): void {
  if (typeof window === 'undefined') return;
  const stats = getWrongStats();
  const wrongSet = new Set(wrongIds);
  const now = new Date().toISOString();
  for (const qId of allAttemptedIds) {
    const cur = stats[qId];
    if (wrongSet.has(qId)) {
      stats[qId] = {
        wrongCount: (cur?.wrongCount ?? 0) + 1,
        lastWrongAt: now,
        graduated: false,
      };
    } else if (cur && !cur.graduated) {
      stats[qId] = { ...cur, graduated: true };
    }
  }
  saveWrongStats(stats);
}

export function getActiveWrongIds(): string[] {
  const stats = getWrongStats();
  return Object.entries(stats)
    .filter(([, s]) => !s.graduated && s.wrongCount > 0)
    .sort((a, b) => b[1].wrongCount - a[1].wrongCount)
    .map(([id]) => id);
}

export function clearAllWrongStats(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WRONG_STATS_KEY);
}

export interface SubjectAccuracy {
  subject: number;
  attempted: number;
  correct: number;
  accuracy: number;
}

const STREAK_KEY = 'bigdata-cbt-streak';

export interface StreakData {
  /** ISO date strings (yyyy-mm-dd) of all study days */
  days: string[];
  current: number;
  best: number;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diffInDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function getStreak(): StreakData {
  if (typeof window === 'undefined') return { days: [], current: 0, best: 0 };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { days: [], current: 0, best: 0 };
    const parsed = JSON.parse(raw) as StreakData;
    return {
      days: parsed.days ?? [],
      current: parsed.current ?? 0,
      best: parsed.best ?? 0,
    };
  } catch {
    return { days: [], current: 0, best: 0 };
  }
}

export function recordStudyToday(): StreakData {
  if (typeof window === 'undefined') return { days: [], current: 0, best: 0 };
  const today = todayKey();
  const existing = getStreak();
  const days = new Set(existing.days);
  if (days.has(today)) return existing;
  days.add(today);

  const sorted = Array.from(days).sort();
  // Compute current streak ending today
  let current = 0;
  let cursor = today;
  while (days.has(cursor)) {
    current += 1;
    const prev = new Date(cursor + 'T00:00:00');
    prev.setDate(prev.getDate() - 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    const d = String(prev.getDate()).padStart(2, '0');
    cursor = `${y}-${m}-${d}`;
  }

  // Compute longest streak ever
  let best = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const day of sorted) {
    if (prevDate && diffInDays(prevDate, day) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prevDate = day;
  }

  const next: StreakData = {
    days: sorted,
    current,
    best: Math.max(best, existing.best),
  };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function getSubjectAccuracyFromAttempts(
  attemptsBySubject: Record<number, { correct: number; total: number }>,
): SubjectAccuracy[] {
  return Object.entries(attemptsBySubject)
    .map(([id, data]) => ({
      subject: Number(id),
      attempted: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.subject - b.subject);
}
