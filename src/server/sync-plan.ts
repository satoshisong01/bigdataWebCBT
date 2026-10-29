/**
 * Server-only, PURE: sync request validation, LWW merge planning and response paging (docs §7.3).
 */
import { SYNC_LIMITS, isSyncNs } from '@/lib/sync/protocol';
import type { RemoteChange, SyncChange, SyncNs, SyncRequest, SyncResponseData } from '@/lib/sync/protocol';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** A change ready for the upsert: clock clamped, value serialized once (null = tombstone). */
export interface PlannedChange {
  ns: SyncNs;
  key: string;
  json: string | null;
  updatedAt: string;
}

/** A sync_records row as sent back to clients, plus its version (decimal bigint string). */
export interface StoredRecord extends RemoteChange {
  version: string;
}

export interface Page {
  rows: StoredRecord[];
  more: boolean;
}

/** Keeps a response well under the 4.5 MB serverless response cap even with large values. */
export const RESPONSE_BUDGET_BYTES = 3_000_000;

export const SYNC_MSG = {
  invalid: '동기화 요청 형식이 올바르지 않습니다',
  tooMany: `한 번에 보낼 수 있는 변경은 ${SYNC_LIMITS.maxChanges}개까지입니다`,
  unstorable: '저장할 수 없는 문자가 들어 있는 기록이 있습니다',
} as const;

const DEVICE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CURSOR_RE = /^(0|[1-9]\d{0,18})$/;
const MAX_CURSOR = BigInt('9223372036854775807');
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
/** an unescaped \u0000 in JSON text, which PostgreSQL jsonb rejects */
const JSON_NUL_RE = /(^|[^\\])(\\\\)*\\u0000/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function invalid(field: string): { ok: false; error: string } {
  return { ok: false, error: `${SYNC_MSG.invalid} (${field})` };
}

export function isValidCursor(v: unknown): v is string {
  return typeof v === 'string' && CURSOR_RE.test(v) && BigInt(v) <= MAX_CURSOR;
}

/** Epoch ms of a strict ISO-8601 timestamp at or after 1970-01-01, else null. */
export function parseIsoMs(v: unknown): number | null {
  if (typeof v !== 'string' || !ISO_RE.test(v)) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

function serialize(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    return null;
  }
}

function parseChange(raw: unknown, i: number): Parsed<SyncChange> {
  const at = `changes[${i}]`;
  if (!isRecord(raw)) return invalid(at);
  const { ns, key, value, updatedAt } = raw;
  if (!isSyncNs(ns)) return invalid(`${at}.ns`);
  if (typeof key !== 'string' || key.length < 1 || key.length > SYNC_LIMITS.maxKeyLength || key.includes('\u0000')) {
    return invalid(`${at}.key`);
  }
  const json = value === undefined ? null : serialize(value);
  if (json === null || Buffer.byteLength(json, 'utf8') > SYNC_LIMITS.maxValueBytes || JSON_NUL_RE.test(json)) {
    return invalid(`${at}.value`);
  }
  if (typeof updatedAt !== 'string' || parseIsoMs(updatedAt) === null) return invalid(`${at}.updatedAt`);
  return { ok: true, value: { ns, key, value, updatedAt } };
}

export function parseSyncRequest(body: unknown): Parsed<SyncRequest> {
  if (!isRecord(body)) return invalid('body');
  const { device, cursor, changes } = body;
  if (typeof device !== 'string' || !DEVICE_RE.test(device)) return invalid('device');
  if (!isValidCursor(cursor)) return invalid('cursor');
  if (!Array.isArray(changes)) return invalid('changes');
  if (changes.length > SYNC_LIMITS.maxChanges) return { ok: false, error: SYNC_MSG.tooMany };
  const parsed: SyncChange[] = [];
  for (let i = 0; i < changes.length; i += 1) {
    const result = parseChange(changes[i], i);
    if (!result.ok) return result;
    parsed.push(result.value);
  }
  return { ok: true, value: { device, cursor, changes: parsed } };
}

/** Identity of a record within one user's data (namespace names never contain '|'). */
export function recordId(ns: string, key: string): string {
  return `${ns}|${key}`;
}

/** Writer clocks more than maxFutureSkewMs ahead of server now are cut back to now. */
export function clampUpdatedAt(iso: string, nowMs: number): string {
  const ms = Date.parse(iso);
  return new Date(ms > nowMs + SYNC_LIMITS.maxFutureSkewMs ? nowMs : ms).toISOString();
}

/**
 * Clamps clocks and keeps one change per (ns, key) — the newest, a later entry winning a tie —
 * because a single INSERT … ON CONFLICT cannot update the same row twice.
 */
export function planChanges(changes: readonly SyncChange[], nowMs: number): PlannedChange[] {
  const byRecord = changes.reduce((acc, c) => {
    const planned: PlannedChange = {
      ns: c.ns,
      key: c.key,
      json: c.value === null ? null : JSON.stringify(c.value),
      updatedAt: clampUpdatedAt(c.updatedAt, nowMs),
    };
    const id = recordId(c.ns, c.key);
    const prev = acc.get(id);
    return !prev || Date.parse(prev.updatedAt) <= Date.parse(planned.updatedAt) ? acc.set(id, planned) : acc;
  }, new Map<string, PlannedChange>());
  return [...byRecord.values()];
}

export function toRemoteChange(r: StoredRecord): RemoteChange {
  return { ns: r.ns, key: r.key, value: r.value, updatedAt: r.updatedAt, device: r.device };
}

function recordBytes(r: StoredRecord): number {
  return Buffer.byteLength(JSON.stringify(toRemoteChange(r)), 'utf8');
}

export function totalBytes(rows: readonly StoredRecord[]): number {
  return rows.reduce((sum, r) => sum + recordBytes(r), 0);
}

/**
 * Rows after the cursor (fetched as pageSize + 1 so `more` is known): at most pageSize and about
 * budgetBytes, but always at least one row so the cursor keeps moving.
 */
export function takePage(rows: readonly StoredRecord[], pageSize: number, budgetBytes: number): Page {
  let used = 0;
  let count = 0;
  for (const row of rows) {
    if (count >= pageSize) break;
    const size = recordBytes(row);
    if (count > 0 && used + size > budgetBytes) break;
    used += size;
    count += 1;
  }
  return { rows: rows.slice(0, count), more: rows.length > count };
}

/**
 * The page (cursor = its last version, or the request cursor when empty) plus the current server
 * rows of rejected changes that the page does not already carry.
 */
export function buildSyncResponse(
  page: Page,
  rejectedCurrent: readonly StoredRecord[],
  requestCursor: string,
  accepted: number,
): SyncResponseData {
  const last = page.rows[page.rows.length - 1];
  const inPage = new Set(page.rows.map((r) => recordId(r.ns, r.key)));
  const extra = rejectedCurrent.filter((r) => !inPage.has(recordId(r.ns, r.key)));
  return {
    cursor: last ? last.version : requestCursor,
    changes: [...page.rows, ...extra].map(toRemoteChange),
    more: page.more,
    accepted,
  };
}
