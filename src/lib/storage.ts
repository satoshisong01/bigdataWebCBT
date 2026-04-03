const HISTORY_KEY = 'bigdata-cbt-history';

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
