/**
 * CONTRACT — export/import every 'bigdata-cbt-*' localStorage entry as one JSON file,
 * so months of progress survive a browser reset or a device change.
 */
import { SAVED_USERNAME_KEY } from './auth';
import { SYNC_META_KEY } from './sync/meta';

export const STORAGE_PREFIX = 'bigdata-cbt-';

/**
 * Device-only keys (docs §7.4 "동기화하지 않음"): the sync meta (device id, account, cursor, synced
 * hashes) and the saved username. Never exported, imported, replaced or rolled back — restoring
 * another device's or account's meta would mark imported data as already uploaded.
 */
export const DEVICE_ONLY_KEYS: readonly string[] = [SYNC_META_KEY, SAVED_USERNAME_KEY];

export interface BackupFile {
  app: 'bigdata-cbt';
  version: 1;
  /** ISO timestamp */
  exportedAt: string;
  /** raw localStorage string values by key */
  data: Record<string, string>;
}

const APP_ID = 'bigdata-cbt';
const BACKUP_VERSION = 1;
const WRITE_ERROR = '브라우저 저장소에 쓸 수 없어 가져오지 못했습니다(저장 공간 부족 등).';
const STORAGE_ERROR = `${WRITE_ERROR} 기존 데이터는 그대로입니다.`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStorageKey(key: string): boolean {
  return key.startsWith(STORAGE_PREFIX) && key.length > STORAGE_PREFIX.length;
}

function isBackupKey(key: string): boolean {
  return isStorageKey(key) && !DEVICE_ONLY_KEYS.includes(key);
}

/** Current prefixed keys except the device-only ones, sorted so exports are deterministic. Throws if storage is inaccessible. */
function prefixedKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    .filter((k): k is string => k !== null && isBackupKey(k))
    .sort();
}

/** Every prefixed entry, or null when storage is unavailable (server, disabled storage). */
function readPrefixed(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    return Object.fromEntries(
      prefixedKeys().flatMap((k): Array<[string, string]> => {
        const v = localStorage.getItem(k);
        return v === null ? [] : [[k, v]];
      }),
    );
  } catch {
    return null;
  }
}

/** Pretty-printed BackupFile JSON of every prefixed entry (sorted by key); empty data if storage is unavailable. */
export function exportBackup(now: Date = new Date()): string {
  const file: BackupFile = {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: readPrefixed() ?? {},
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; keys: number } | { ok: false; error: string };

type ParsedBackup = { ok: true; data: Record<string, string> } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function isStringEntry(entry: [string, unknown]): entry is [string, string] {
  return typeof entry[1] === 'string';
}

function parseBackup(json: string): ParsedBackup {
  let file: unknown;
  try {
    file = JSON.parse(json);
  } catch {
    return fail('백업 파일을 읽을 수 없습니다. JSON 형식이 아닙니다.');
  }
  if (!isRecord(file) || file.app !== APP_ID) return fail('이 앱(빅데이터분석기사 필기)의 백업 파일이 아닙니다.');
  const { version, data } = file;
  if (version !== BACKUP_VERSION) {
    return fail(`지원하지 않는 백업 버전입니다${typeof version === 'number' ? ` (v${version})` : ''}.`);
  }
  if (!isRecord(data)) return fail('백업 데이터 형식이 올바르지 않습니다.');
  const entries = Object.entries(data);
  if (entries.length === 0) return fail('백업 파일에 복원할 데이터가 없습니다.');
  const foreign = entries.find(([key]) => !isStorageKey(key));
  if (foreign) return fail(`이 앱의 데이터가 아닌 항목이 들어 있습니다: ${foreign[0]}`);
  const malformed = entries.find(entry => !isStringEntry(entry));
  if (malformed) return fail(`'${malformed[0]}' 항목의 값 형식이 올바르지 않습니다.`);
  // older backups contain device-only keys: skip them instead of rejecting the file
  const restorable = entries.filter(isStringEntry).filter(([key]) => isBackupKey(key));
  if (restorable.length === 0) return fail('백업 파일에 복원할 데이터가 없습니다.');
  return { ok: true, data: Object.fromEntries(restorable) };
}

function hasKey(map: Readonly<Record<string, string>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** Rolls back to the pre-import state (drop keys the import added, rewrite changed ones); false if that failed too. */
function restore(snapshot: Readonly<Record<string, string>>): boolean {
  try {
    prefixedKeys().filter(k => !hasKey(snapshot, k)).forEach(k => localStorage.removeItem(k));
    Object.entries(snapshot)
      .filter(([k, v]) => localStorage.getItem(k) !== v)
      .forEach(([k, v]) => localStorage.setItem(k, v));
    return true;
  } catch {
    return false;
  }
}

function writeBackup(data: Readonly<Record<string, string>>, mode: 'replace' | 'merge'): ImportResult {
  const snapshot = readPrefixed();
  if (!snapshot) return fail(STORAGE_ERROR);
  try {
    if (mode === 'replace') {
      // Keys the backup also has are overwritten below; removing the rest first frees quota.
      Object.keys(snapshot).filter(k => !hasKey(data, k)).forEach(k => localStorage.removeItem(k));
    }
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
    return { ok: true, keys: Object.keys(data).length };
  } catch {
    return fail(restore(snapshot) ? STORAGE_ERROR : `${WRITE_ERROR} 기존 데이터 일부를 되돌리지 못했습니다.`);
  }
}

/**
 * Validates shape (app, version, data object of string values, keys with STORAGE_PREFIX only)
 * before writing anything. 'replace' clears existing prefixed keys first; 'merge' overwrites per key.
 * A backup without entries is rejected (in 'replace' mode it would only wipe progress), and a
 * failed write rolls storage back to its pre-import state.
 * Errors are Korean, user-facing messages.
 */
export function importBackup(json: string, mode: 'replace' | 'merge'): ImportResult {
  const parsed = parseBackup(json);
  return parsed.ok ? writeBackup(parsed.data, mode) : parsed;
}
