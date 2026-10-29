/** Applies one /api/sync response to local storage and the sync meta (docs §7.5). */
import type { RemoteChange, SyncChange, SyncNs, SyncResponseData } from './protocol';
import type { AdapterChange, SyncAdapter } from './adapters';
import { hashValue, NULL_HASH } from './hash';
import type { SyncMeta } from './meta';
import { fullKey, type LocalSnapshot } from './scan';

export interface MergeInput {
  adapters: ReadonlyMap<SyncNs, SyncAdapter>;
  /** meta from a scan taken after the response arrived (sees edits made during the request) */
  meta: SyncMeta;
  local: LocalSnapshot;
  /** the changes the request carried */
  sent: readonly SyncChange[];
  response: SyncResponseData;
}

export interface MergeResult {
  meta: SyncMeta;
  /** remote changes written to local storage */
  applied: number;
  /**
   * an adapter could not write localStorage: its records were left unsettled, so the caller must not
   * advance the cursor — the next sync fetches and applies them again
   */
  failed: boolean;
}

interface Settlement {
  readonly full: string;
  readonly ns: SyncNs;
  readonly hash: string;
}

/** One entry per record — a rejected change's echo may repeat a row of the version page. */
function remoteByKey(changes: readonly RemoteChange[]): Map<string, RemoteChange> {
  return new Map(changes.map(c => [fullKey(c.ns, c.key), c]));
}

/**
 * - a sent change without a remote counterpart was stored as sent → synced
 * - remote hash == local hash → settled
 * - a value the namespace cannot store → ignored
 * - local record dirty with a newer clock than the remote updatedAt → kept (uploaded next round)
 * - otherwise the remote value is applied through the namespace adapter (one write per namespace)
 */
export function mergeResponse({ adapters, meta, local, sent, response }: MergeInput): MergeResult {
  const remote = remoteByKey(response.changes);
  const synced = new Map(Object.entries(meta.synced));
  const dirty = new Map(Object.entries(meta.dirty));
  const localHash = (full: string): string => local.get(full)?.hash ?? NULL_HASH;
  const settle = ({ full, hash }: Settlement): void => {
    if (hash === NULL_HASH) synced.delete(full);
    else synced.set(full, hash);
    dirty.delete(full);
  };

  for (const change of sent) {
    const full = fullKey(change.ns, change.key);
    if (remote.has(full)) continue;
    const hash = hashValue(change.value);
    if (localHash(full) === hash) settle({ full, ns: change.ns, hash });
    else if (hash === NULL_HASH) synced.delete(full); // edited during the request: stays dirty
    else synced.set(full, hash);
  }

  const queued = new Map<SyncNs, AdapterChange[]>();
  const toApply: Settlement[] = [];
  for (const [full, change] of remote) {
    const settlement: Settlement = { full, ns: change.ns, hash: hashValue(change.value) };
    if (localHash(full) === settlement.hash) {
      settle(settlement);
      continue;
    }
    // a shape this app cannot store (e.g. written by a newer version): leave record and sync state alone,
    // so no tombstone or stale upload ever overwrites it on the server
    if (!adapters.get(change.ns)?.accepts(change.key, change.value)) continue;
    const pending = dirty.get(full);
    if (pending !== undefined && Date.parse(pending) > Date.parse(change.updatedAt)) continue;
    const list = queued.get(change.ns) ?? [];
    list.push({ key: change.key, value: change.value });
    queued.set(change.ns, list);
    toApply.push(settlement);
  }

  const failedNs = new Set<SyncNs>();
  for (const [ns, changes] of queued) {
    const adapter = adapters.get(ns);
    if (adapter && !adapter.apply(changes)) failedNs.add(ns);
  }
  const written = toApply.filter(s => !failedNs.has(s.ns));
  written.forEach(settle);
  return {
    meta: { ...meta, synced: Object.fromEntries(synced), dirty: Object.fromEntries(dirty) },
    applied: written.length,
    failed: failedNs.size > 0,
  };
}
