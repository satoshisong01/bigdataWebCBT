/** Sync metadata — localStorage 'bigdata-cbt-sync' (docs §7.5). Device-local: never synced itself. */
import { isRecord, readJson, writeJson, type StorageGetter } from './store';

export const SYNC_META_KEY = 'bigdata-cbt-sync';

/**
 * LWW clock of unstamped local records before the account's first full sync on this device:
 * such records only fill gaps on the server and never overwrite what is already there.
 */
export const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

export interface SyncMeta {
  username?: string;
  userId?: number;
  /** random per browser, [A-Za-z0-9_-]{1,64} */
  device: string;
  /** server version cursor (decimal string) */
  cursor: string;
  /** "ns|key" → hash of the value known to match the server */
  synced: Record<string, string>;
  /** "ns|key" → LWW timestamp (ISO) of a local change waiting for upload */
  dirty: Record<string, string>;
  /** the account's first full sync on this device has finished */
  initialDone: boolean;
  /**
   * "ns|key" → hash of each unstamped local record when this account's first sync on this device
   * began (dropped once initialDone). Only these, while unchanged, get the EPOCH clock — edits and
   * deletions made after login are real changes even if the first sync was interrupted.
   */
  baseline?: Record<string, string>;
  lastSyncAt?: string;
  lastError?: string;
}

const DEVICE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CURSOR_PATTERN = /^\d{1,20}$/;

export function isDeviceId(v: unknown): v is string {
  return typeof v === 'string' && DEVICE_PATTERN.test(v);
}

function isIsoString(v: string): boolean {
  return Number.isFinite(Date.parse(v));
}

function stringMap(v: unknown, valueOk: (s: string) => boolean): Record<string, string> {
  if (!isRecord(v)) return {};
  return Object.fromEntries(
    Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string' && valueOk(e[1])),
  );
}

function optionalText(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function optionalId(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : undefined;
}

export function writeMeta(storage: StorageGetter, meta: SyncMeta): boolean {
  return writeJson(storage, SYNC_META_KEY, meta);
}

/** Stored meta validated field by field; a missing device id is generated and persisted right away. */
export function readMeta(storage: StorageGetter, newDeviceId: () => string): SyncMeta {
  const raw = readJson(storage, SYNC_META_KEY);
  const src = isRecord(raw) ? raw : {};
  const device = isDeviceId(src.device) ? src.device : undefined;
  const meta: SyncMeta = {
    username: optionalText(src.username),
    userId: optionalId(src.userId),
    device: device ?? newDeviceId(),
    cursor: typeof src.cursor === 'string' && CURSOR_PATTERN.test(src.cursor) ? src.cursor : '0',
    synced: stringMap(src.synced, () => true),
    dirty: stringMap(src.dirty, isIsoString),
    initialDone: src.initialDone === true,
    baseline: isRecord(src.baseline) ? stringMap(src.baseline, () => true) : undefined,
    lastSyncAt: optionalText(src.lastSyncAt),
    lastError: optionalText(src.lastError),
  };
  if (device === undefined) writeMeta(storage, meta);
  return meta;
}

/** Sync progress for a new account / after logout (device id and last userId are kept). */
export function resetSyncState(meta: SyncMeta): SyncMeta {
  return { device: meta.device, userId: meta.userId, cursor: '0', synced: {}, dirty: {}, initialDone: false };
}
