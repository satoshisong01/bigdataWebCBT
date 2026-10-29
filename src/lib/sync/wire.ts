/** Validation of server payloads (protocol.ts shapes) — server data is never trusted blindly. */
import { isSyncNs, type MeData, type RemoteChange, type SyncResponseData } from './protocol';
import { isRecord } from './store';

const CURSOR_PATTERN = /^\d{1,20}$/;
const NUMERIC_ID = /^\d{1,15}$/;

/** Entries of unknown namespaces (a newer server) or malformed entries are dropped. */
function toRemoteChange(v: unknown): RemoteChange[] {
  if (!isRecord(v)) return [];
  const { ns, key, value, updatedAt, device } = v;
  const valid =
    isSyncNs(ns) && typeof key === 'string' && key !== '' && typeof updatedAt === 'string'
    && Number.isFinite(Date.parse(updatedAt));
  return valid
    ? [{ ns, key, value: value === undefined ? null : value, updatedAt, device: typeof device === 'string' ? device : '' }]
    : [];
}

export function parseSyncResponse(data: unknown): SyncResponseData | undefined {
  if (!isRecord(data)) return undefined;
  const { cursor, changes, more, accepted } = data;
  if (typeof cursor !== 'string' || !CURSOR_PATTERN.test(cursor) || !Array.isArray(changes) || typeof more !== 'boolean') {
    return undefined;
  }
  return {
    cursor,
    changes: changes.flatMap(toRemoteChange),
    more,
    accepted: typeof accepted === 'number' && Number.isFinite(accepted) ? accepted : 0,
  };
}

/** Accepts a numeric-string userId too (Postgres bigint columns arrive as strings). */
export function parseMe(data: unknown): MeData | undefined {
  if (!isRecord(data)) return undefined;
  const { userId, username } = data;
  const id = typeof userId === 'number' ? userId : typeof userId === 'string' && NUMERIC_ID.test(userId) ? Number(userId) : NaN;
  return Number.isSafeInteger(id) && typeof username === 'string' && username !== '' ? { userId: id, username } : undefined;
}
