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
