import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_ONLY_KEYS, STORAGE_PREFIX, exportBackup, importBackup } from './backup';
import type { BackupFile } from './backup';

const NOW = new Date('2026-10-29T00:30:00.000Z');
const EXISTING: Readonly<Record<string, string>> = {
  'bigdata-cbt-theme': 'dark',
  'bigdata-cbt-qstats': '{"5-1":{"n":1,"c":1}}',
  'other-app': 'keep me',
};
const PREFIXED = {
  'bigdata-cbt-qstats': EXISTING['bigdata-cbt-qstats'],
  'bigdata-cbt-theme': 'dark',
};

function backupJson(data: unknown, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ app: 'bigdata-cbt', version: 1, exportedAt: NOW.toISOString(), data, ...overrides });
}

function snapshot(): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .flatMap((k): Array<[string, string]> => {
        const v = k === null ? null : localStorage.getItem(k);
        return k === null || v === null ? [] : [[k, v]];
      }),
  );
}

function refuseWritesTo(blocked: (key: string) => boolean): void {
  const realSetItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    if (blocked(key)) throw new DOMException('full', 'QuotaExceededError');
    realSetItem.call(localStorage, key, value);
  });
}

beforeEach(() => {
  localStorage.clear();
  Object.entries(EXISTING).forEach(([k, v]) => localStorage.setItem(k, v));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('exportBackup', () => {
  it('exports every prefixed entry, sorted by key, with app metadata', () => {
    localStorage.setItem('bigdata-cbt-activity', '{}');
    localStorage.setItem(STORAGE_PREFIX, 'bare prefix');
    const file: BackupFile = JSON.parse(exportBackup());
    expect(file).toEqual({
      app: 'bigdata-cbt',
      version: 1,
      exportedAt: NOW.toISOString(),
      data: { 'bigdata-cbt-activity': '{}', ...PREFIXED },
    });
    expect(Object.keys(file.data)).toEqual(['bigdata-cbt-activity', 'bigdata-cbt-qstats', 'bigdata-cbt-theme']);
  });

  it('uses the given timestamp', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    expect(JSON.parse(exportBackup(at)).exportedAt).toBe(at.toISOString());
  });

  it('exports empty data when storage is unreadable or on the server', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(JSON.parse(exportBackup()).data).toEqual({});
    vi.restoreAllMocks();
    vi.stubGlobal('window', undefined);
    expect(JSON.parse(exportBackup()).data).toEqual({});
  });
});

describe('importBackup', () => {
  it('round-trips an export into a fresh browser', () => {
    const json = exportBackup();
    localStorage.clear();
    expect(importBackup(json, 'replace')).toEqual({ ok: true, keys: 2 });
    expect(snapshot()).toEqual(PREFIXED);
  });

  it("replace: drops prefixed keys missing from the backup and keeps other apps' keys", () => {
    const json = backupJson({ 'bigdata-cbt-settings': '{"dailyCardGoal":10}', 'bigdata-cbt-theme': 'light' });
    expect(importBackup(json, 'replace')).toEqual({ ok: true, keys: 2 });
    expect(snapshot()).toEqual({
      'bigdata-cbt-settings': '{"dailyCardGoal":10}',
      'bigdata-cbt-theme': 'light',
      'other-app': 'keep me',
    });
  });

  it('merge: overwrites per key and keeps everything else', () => {
    const json = backupJson({ 'bigdata-cbt-theme': 'light', 'bigdata-cbt-streak': '{"days":[]}' });
    expect(importBackup(json, 'merge')).toEqual({ ok: true, keys: 2 });
    expect(snapshot()).toEqual({ ...EXISTING, 'bigdata-cbt-theme': 'light', 'bigdata-cbt-streak': '{"days":[]}' });
  });

  it.each([
    ['non-JSON text', 'not json', /JSON 형식이 아닙니다/],
    ['a JSON array', '[1,2]', /백업 파일이 아닙니다/],
    ['JSON null', 'null', /백업 파일이 아닙니다/],
    ['another app', backupJson({ 'bigdata-cbt-x': '1' }, { app: 'other-app' }), /백업 파일이 아닙니다/],
    ['a newer version', backupJson({ 'bigdata-cbt-x': '1' }, { version: 2 }), /지원하지 않는 백업 버전입니다 \(v2\)/],
    ['a missing version', backupJson({ 'bigdata-cbt-x': '1' }, { version: undefined }), /^지원하지 않는 백업 버전입니다\.$/],
    ['missing data', backupJson(undefined), /데이터 형식이 올바르지 않습니다/],
    ['array data', backupJson(['bigdata-cbt-x']), /데이터 형식이 올바르지 않습니다/],
    ['null data', backupJson(null), /데이터 형식이 올바르지 않습니다/],
    ['empty data', backupJson({}), /복원할 데이터가 없습니다/],
    ['a key without the prefix', backupJson({ 'bigdata-cbt-x': '1', 'evil-key': 'x' }), /아닌 항목.*evil-key/],
    ['a bare prefix key', backupJson({ [STORAGE_PREFIX]: 'x' }), /아닌 항목/],
    ['a non-string value', backupJson({ 'bigdata-cbt-qstats': { a: 1 } }), /'bigdata-cbt-qstats' 항목의 값 형식/],
  ])('rejects %s without touching storage', (_label, json, message) => {
    for (const mode of ['replace', 'merge'] as const) {
      expect(importBackup(json, mode)).toEqual({ ok: false, error: expect.stringMatching(message) });
      expect(snapshot()).toEqual(EXISTING);
    }
  });

  it.each(['replace', 'merge'] as const)('%s: rolls back when the browser refuses a write', mode => {
    refuseWritesTo(key => key === 'bigdata-cbt-huge');
    const json = backupJson({
      'bigdata-cbt-activity': '{}',
      'bigdata-cbt-theme': 'light',
      'bigdata-cbt-huge': 'x'.repeat(100),
    });
    expect(importBackup(json, mode)).toEqual({ ok: false, error: expect.stringContaining('기존 데이터는 그대로') });
    expect(snapshot()).toEqual(EXISTING);
  });

  it('says so honestly when even the rollback is refused', () => {
    refuseWritesTo(() => true);
    expect(importBackup(backupJson({ 'bigdata-cbt-theme': 'light' }), 'merge')).toEqual({
      ok: false,
      error: expect.stringContaining('기존 데이터는 그대로'),
    });
    expect(importBackup(backupJson({ 'bigdata-cbt-theme': 'light' }), 'replace')).toEqual({
      ok: false,
      error: expect.stringContaining('되돌리지 못했습니다'),
    });
    expect(localStorage.getItem('bigdata-cbt-theme')).toBe('dark');
  });

  it('writes nothing when storage is unreadable or on the server', () => {
    const json = backupJson({ 'bigdata-cbt-theme': 'light' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    expect(importBackup(json, 'merge')).toEqual({ ok: false, error: expect.stringContaining('가져오지 못했습니다') });
    expect(setItem).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.stubGlobal('window', undefined);
    expect(importBackup(json, 'replace').ok).toBe(false);
    vi.unstubAllGlobals();
    expect(snapshot()).toEqual(EXISTING);
  });
});

describe('device-only keys (sync meta, saved username)', () => {
  const META = '{"device":"dev-here","userId":1,"cursor":"42","synced":{},"dirty":{},"initialDone":true}';

  beforeEach(() => {
    localStorage.setItem('bigdata-cbt-sync', META);
    localStorage.setItem('bigdata-cbt-saved-username', 'me');
  });

  it('lists exactly the sync meta and the saved username', () => {
    expect(DEVICE_ONLY_KEYS).toEqual(['bigdata-cbt-sync', 'bigdata-cbt-saved-username']);
  });

  it('are never exported', () => {
    const file = JSON.parse(exportBackup()) as BackupFile;
    expect(file.data).toEqual(PREFIXED);
  });

  it.each(['replace', 'merge'] as const)('%s: ignores them in the file and keeps the live ones', (mode) => {
    const foreignMeta = '{"device":"dev-other","userId":2,"cursor":"999","synced":{},"dirty":{},"initialDone":true}';
    const json = backupJson({
      'bigdata-cbt-sync': foreignMeta,
      'bigdata-cbt-saved-username': 'someone-else',
      'bigdata-cbt-settings': '{"dailyCardGoal":10}',
    });
    expect(importBackup(json, mode)).toEqual({ ok: true, keys: 1 });
    expect(localStorage.getItem('bigdata-cbt-sync')).toBe(META);
    expect(localStorage.getItem('bigdata-cbt-saved-username')).toBe('me');
    expect(localStorage.getItem('bigdata-cbt-settings')).toBe('{"dailyCardGoal":10}');
  });

  it('rejects a file that holds nothing but device-only keys', () => {
    const json = backupJson({ 'bigdata-cbt-sync': META });
    expect(importBackup(json, 'replace')).toEqual({ ok: false, error: '백업 파일에 복원할 데이터가 없습니다.' });
    expect(localStorage.getItem('bigdata-cbt-qstats')).toBe(EXISTING['bigdata-cbt-qstats']);
  });
});
