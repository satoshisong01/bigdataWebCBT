/**
 * Server-only: the single sync transaction of docs §7.3 (LWW upsert, then read-back).
 */
import { SYNC_LIMITS } from '@/lib/sync/protocol';
import type { SyncNs, SyncRequest, SyncResponseData } from '@/lib/sync/protocol';
import type { Db, DbTx } from './db';
import { RESPONSE_BUDGET_BYTES, buildSyncResponse, planChanges, recordId, takePage, totalBytes } from './sync-plan';
import type { PlannedChange, StoredRecord } from './sync-plan';

interface RecordRow {
  ns: SyncNs;
  key: string;
  value: unknown;
  updated_at: Date;
  device: string;
  version: string;
}

const RECORD_COLUMNS = 'r.ns, r.key, r.value, r.updated_at, r.device, r.version';

function toStored(row: RecordRow): StoredRecord {
  return {
    ns: row.ns,
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at.toISOString(),
    device: row.device,
    version: row.version,
  };
}

/** Batched LWW upsert: a stored row changes only when its updated_at is older (a tie keeps it). */
async function upsertChanges(
  tx: DbTx,
  userId: number,
  device: string,
  changes: readonly PlannedChange[],
): Promise<Set<string>> {
  if (changes.length === 0) return new Set();
  const { rows } = await tx.query<{ ns: string; key: string }>(
    `insert into ${tx.s}.sync_records as r (user_id, ns, key, value, updated_at, device, version)
     select $1, c.ns, c.key, c.value, c.updated_at, $2, nextval('${tx.s}.sync_version_seq')
       from unnest($3::text[], $4::text[], $5::jsonb[], $6::timestamptz[]) as c(ns, key, value, updated_at)
     on conflict (user_id, ns, key) do update
        set value = excluded.value, updated_at = excluded.updated_at,
            device = excluded.device, version = excluded.version
      where r.updated_at < excluded.updated_at
     returning r.ns, r.key`,
    [
      userId,
      device,
      changes.map((c) => c.ns),
      changes.map((c) => c.key),
      changes.map((c) => c.json),
      changes.map((c) => c.updatedAt),
    ],
  );
  return new Set(rows.map((row) => recordId(row.ns, row.key)));
}

async function currentRows(tx: DbTx, userId: number, keys: readonly PlannedChange[]): Promise<StoredRecord[]> {
  if (keys.length === 0) return [];
  const { rows } = await tx.query<RecordRow>(
    `select ${RECORD_COLUMNS}
       from ${tx.s}.sync_records r
       join unnest($2::text[], $3::text[]) as k(ns, key) on r.ns = k.ns and r.key = k.key
      where r.user_id = $1`,
    [userId, keys.map((k) => k.ns), keys.map((k) => k.key)],
  );
  return rows.map(toStored);
}

async function rowsAfter(tx: DbTx, userId: number, cursor: string, limit: number): Promise<StoredRecord[]> {
  const { rows } = await tx.query<RecordRow>(
    `select ${RECORD_COLUMNS} from ${tx.s}.sync_records r
      where r.user_id = $1 and r.version > $2::bigint
      order by r.version
      limit $3`,
    [userId, cursor, limit],
  );
  return rows.map(toStored);
}

/**
 * Locks the user's row first: syncs of one user run one at a time, so versions become visible in
 * order and a cursor can never step over a version that commits later.
 */
export async function runSync(db: Db, userId: number, request: SyncRequest, now: Date): Promise<SyncResponseData> {
  const planned = planChanges(request.changes, now.getTime());
  return db.transaction(async (tx) => {
    await tx.query(`select 1 from ${tx.s}.users where id = $1 for no key update`, [userId]);
    const stored = await upsertChanges(tx, userId, request.device, planned);
    const rejected = planned.filter((c) => !stored.has(recordId(c.ns, c.key)));
    const rejectedCurrent = await currentRows(tx, userId, rejected);
    const after = await rowsAfter(tx, userId, request.cursor, SYNC_LIMITS.pageSize + 1);
    const budget = Math.max(0, RESPONSE_BUDGET_BYTES - totalBytes(rejectedCurrent));
    const page = takePage(after, SYNC_LIMITS.pageSize, budget);
    return buildSyncResponse(page, rejectedCurrent, request.cursor, stored.size);
  });
}

/** PostgreSQL rejected the payload itself (text jsonb/text cannot hold), not a server fault. */
export function isPayloadError(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
  return code === '22P02' || code === '22P05' || code === '22021';
}
