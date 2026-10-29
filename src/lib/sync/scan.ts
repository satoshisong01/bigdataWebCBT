/** Local change detection (docs §7.5 "scan") and upload batching. */
import { isSyncNs, SYNC_LIMITS, type SyncChange, type SyncNs } from './protocol';
import { stampContextOf, type SyncAdapter } from './adapters';
import { fnv1a, NULL_HASH, stableStringify, utf8Length } from './hash';
import { EPOCH_ISO, type SyncMeta } from './meta';

export interface LocalRecord {
  readonly value: unknown;
  readonly hash: string;
}

/** "ns|key" → the record as currently stored on this device. */
export type LocalSnapshot = ReadonlyMap<string, LocalRecord>;

export interface ScanInput {
  adapters: readonly SyncAdapter[];
  meta: SyncMeta;
  /** "ns|key" → hash from the previous scan in this page session (empty after a reload) */
  seen: ReadonlyMap<string, string>;
  /** ISO */
  now: string;
}

export interface ScanResult {
  meta: SyncMeta;
  local: LocalSnapshot;
  /** feed into the next scan */
  seen: Map<string, string>;
}

export function fullKey(ns: SyncNs, key: string): string {
  return `${ns}|${key}`;
}

/** Splits at the first '|' (mock record keys contain '|' themselves). */
export function splitKey(full: string): { ns: string; key: string } {
  const at = full.indexOf('|');
  return { ns: full.slice(0, at), key: full.slice(at + 1) };
}

function keyFits(key: string): boolean {
  return key.length >= 1 && key.length <= SYNC_LIMITS.maxKeyLength;
}

/**
 * "ns|key" → hash of every local record without its own stamp: the records that existed before this
 * account's first sync (meta.baseline), the only ones the EPOCH clock may apply to.
 */
export function baselineOf(adapters: readonly SyncAdapter[]): Record<string, string> {
  const reads = adapters.map(adapter => ({ adapter, records: adapter.read() }));
  const ctx = stampContextOf(reads.find(r => r.adapter.ns === 'history')?.records ?? {});
  return Object.fromEntries(
    reads.flatMap(({ adapter, records }) =>
      Object.entries(records)
        .filter(([key, value]) => adapter.stamp(value, key, ctx) === undefined)
        .map(([key, value]): [string, string] => [fullKey(adapter.ns, key), fnv1a(stableStringify(value))]),
    ),
  );
}

/**
 * Rebuilds `dirty` from the current local records:
 * - a record whose hash differs from `synced` is dirty, clocked by its stamp; without one by EPOCH
 *   while the account's first full sync is unfinished AND the record is unchanged since login
 *   (meta.baseline; no baseline = legacy meta, every record counts as unchanged); otherwise by the
 *   time the change was first seen (kept while the record stays unchanged, so a retried upload
 *   never looks newer than it is);
 * - a synced record of a deletable namespace that is gone locally becomes a tombstone (a deletion
 *   is never in the baseline, so it gets a real clock unless the meta predates baselines).
 * Records the server would refuse (key or value too large) stay local-only and are never tombstoned.
 */
export function scan({ adapters, meta, seen, now }: ScanInput): ScanResult {
  const local = new Map<string, LocalRecord>();
  const nextSeen = new Map<string, string>();
  const dirty: Array<[string, string]> = [];
  const clock = (full: string, hash: string, stamp: string | undefined): string => {
    if (stamp !== undefined) return stamp;
    const untouched = meta.baseline === undefined || meta.baseline[full] === hash;
    if (!meta.initialDone && untouched) return EPOCH_ISO;
    const previous = meta.dirty[full];
    const lastHash = seen.get(full);
    const keep = previous !== undefined && (previous !== EPOCH_ISO || untouched) && (lastHash === undefined || lastHash === hash);
    return keep ? previous : now;
  };

  const reads = adapters.map(adapter => ({ adapter, records: adapter.read() }));
  const ctx = stampContextOf(reads.find(r => r.adapter.ns === 'history')?.records ?? {});
  for (const { adapter, records } of reads) {
    for (const [key, value] of Object.entries(records)) {
      const full = fullKey(adapter.ns, key);
      const json = stableStringify(value);
      const hash = fnv1a(json);
      local.set(full, { value, hash });
      nextSeen.set(full, hash);
      const sendable = keyFits(key) && utf8Length(json) <= SYNC_LIMITS.maxValueBytes;
      if (sendable && meta.synced[full] !== hash) dirty.push([full, clock(full, hash, adapter.stamp(value, key, ctx))]);
    }
  }

  const deletable = new Set<string>(adapters.filter(a => a.deletable).map(a => a.ns));
  for (const [full, hash] of Object.entries(meta.synced)) {
    if (local.has(full) || hash === NULL_HASH || !deletable.has(splitKey(full).ns)) continue;
    nextSeen.set(full, NULL_HASH);
    dirty.push([full, clock(full, NULL_HASH, undefined)]);
  }
  return { meta: { ...meta, dirty: Object.fromEntries(dirty) }, local, seen: nextSeen };
}

/** Room for the request envelope {"device":…,"cursor":…,"changes":[]}. */
const ENVELOPE_BYTES = 256;

/** "ns|key" → hash of the value already uploaded in this run. */
export type Attempts = ReadonlyMap<string, string>;

/**
 * Already uploaded in this run with its current value — not offered again, so a record the server
 * keeps refusing cannot ping-pong; a record edited again since its upload is offered again.
 */
export function wasAttempted(attempts: Attempts, local: LocalSnapshot, full: string): boolean {
  const sent = attempts.get(full);
  return sent !== undefined && sent === (local.get(full)?.hash ?? NULL_HASH);
}

/**
 * Dirty records not yet attempted in this run, within SYNC_LIMITS.maxChanges and `maxBytes` of
 * request body (a record that does not fit waits for a later request). Scan order is kept, so
 * other devices append array records (bookmarks, history) in this device's order.
 */
export function takeBatch(meta: SyncMeta, local: LocalSnapshot, attempts: Attempts, maxBytes: number): SyncChange[] {
  const batch: SyncChange[] = [];
  let bytes = ENVELOPE_BYTES;
  for (const full of Object.keys(meta.dirty)) {
    if (batch.length >= SYNC_LIMITS.maxChanges) break;
    const { ns, key } = splitKey(full);
    if (!isSyncNs(ns) || wasAttempted(attempts, local, full)) continue;
    const change: SyncChange = { ns, key, value: local.get(full)?.value ?? null, updatedAt: meta.dirty[full] };
    const size = utf8Length(JSON.stringify(change)) + 1;
    if (bytes + size > maxBytes) continue;
    bytes += size;
    batch.push(change);
  }
  return batch;
}
