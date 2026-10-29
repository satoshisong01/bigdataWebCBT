import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { backupFileName, downloadTextFile } from './backupFile';
import { HISTORY_KEYS, readResetCounts, resettableKeys, runReset } from './resetActions';

const QSTAT = { n: 1, c: 0, first: false, ok: false, unsure: false, last: '2026-10-29T00:00:00.000Z' };
const CSTAT = { srs: { box: 2, due: '2026-11-01' }, n: 1, again: 0, last: '2026-10-29T00:00:00.000Z' };

function seed(): void {
  localStorage.setItem('bigdata-cbt-history', JSON.stringify([{ key: 'session-2', score: 70, passed: true, date: '2026-10-01' }]));
  localStorage.setItem('bigdata-cbt-answers', '{"session-2":{"2-1":1}}');
  localStorage.setItem('bigdata-cbt-wrong', '{"session-2":["2-1"]}');
  localStorage.setItem('bigdata-cbt-retry-ctx', '{}');
  localStorage.setItem('bigdata-cbt-bookmarks', '["2-1"]');
  localStorage.setItem('bigdata-cbt-wrong-stats', '{"2-1":{"wrongCount":1,"lastWrongAt":"2026-10-01","graduated":false}}');
  localStorage.setItem('bigdata-cbt-qstats', JSON.stringify({
    '2-1': { ...QSTAT, srs: { box: 1, due: '2026-10-29' } },
    '2-2': { ...QSTAT, c: 1, first: true, ok: true },
  }));
  localStorage.setItem('bigdata-cbt-cstats', JSON.stringify({ 'card-1': CSTAT }));
  localStorage.setItem('bigdata-cbt-settings', '{"planStart":"2026-10-29"}');
  localStorage.setItem('bigdata-cbt-theme', 'dark');
  localStorage.setItem('other-app', 'keep');
}

function keys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '').sort();
}

describe('runReset', () => {
  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it('풀이 기록 removes only the legacy exam records', () => {
    expect(runReset('history')).toBe(true);
    HISTORY_KEYS.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    expect(localStorage.getItem('bigdata-cbt-qstats')).not.toBeNull();
    expect(localStorage.getItem('bigdata-cbt-bookmarks')).not.toBeNull();
  });

  it('복습 덱·문항 통계 clears QStats and the legacy wrong-stats', () => {
    expect(runReset('questions')).toBe(true);
    expect(localStorage.getItem('bigdata-cbt-qstats')).toBeNull();
    expect(localStorage.getItem('bigdata-cbt-wrong-stats')).toBeNull();
    expect(localStorage.getItem('bigdata-cbt-history')).not.toBeNull();
    expect(localStorage.getItem('bigdata-cbt-cstats')).not.toBeNull();
  });

  it('개념 학습 기록 clears CStats only', () => {
    expect(runReset('concepts')).toBe(true);
    expect(localStorage.getItem('bigdata-cbt-cstats')).toBeNull();
    expect(localStorage.getItem('bigdata-cbt-qstats')).not.toBeNull();
  });

  it('전체 removes every bigdata-cbt-* key except the theme and leaves other apps alone', () => {
    expect(resettableKeys()).not.toContain('bigdata-cbt-theme');
    expect(runReset('all')).toBe(true);
    expect(keys()).toEqual(['bigdata-cbt-theme', 'other-app']);
  });

  it('counts what each reset would delete', () => {
    expect(readResetCounts()).toEqual({ history: 1, questions: 2, deck: 1, concepts: 1 });
    runReset('all');
    expect(readResetCounts()).toEqual({ history: 0, questions: 0, deck: 0, concepts: 0 });
  });
});

describe('backup file helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('names the file after the local date', () => {
    expect(backupFileName(new Date(2026, 9, 29, 23, 59))).toBe('bigdata-cbt-backup-20261029.json');
    expect(backupFileName(new Date(2027, 0, 5, 0, 1))).toBe('bigdata-cbt-backup-20270105.json');
  });

  it('downloads through a temporary object URL and revokes it afterwards', () => {
    vi.useFakeTimers();
    const create = vi.fn<(obj: Blob | MediaSource) => string>(() => 'blob:backup');
    const revoke = vi.fn<(url: string) => void>();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const clicked: Array<{ href: string; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download });
    });

    downloadTextFile('{"app":"bigdata-cbt"}', 'bigdata-cbt-backup-20261029.json');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clicked).toEqual([{ href: 'blob:backup', download: 'bigdata-cbt-backup-20261029.json' }]);
    expect(document.querySelectorAll('a').length).toBe(0);
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:backup');
  });
});
