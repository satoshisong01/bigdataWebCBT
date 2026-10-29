/** Public types and window events of the sync engine (no runtime deps, so UI code can import it cheaply). */

/** Dispatched on window after a sync wrote records from another device; detail: SyncEventDetail. */
export const SYNC_EVENT = 'bigdata-cbt-synced';
/** Dispatched on window whenever getSyncStatus() / getAuthState() may have changed (no detail). */
export const SYNC_STATUS_EVENT = 'bigdata-cbt-sync-status';

export interface SyncEventDetail {
  applied: number;
}

export type SyncSkipReason = 'offline' | 'logged-out' | 'busy';

export type SyncResult =
  | { status: 'ok'; applied: number; sent: number; rounds: number }
  | { status: 'skipped'; reason: SyncSkipReason }
  /** the session expired: now logged out */
  | { status: 'unauthorized'; error: string }
  | { status: 'error'; error: string; applied: number };

export interface SyncOptions {
  /** the page is being hidden: requests use fetch keepalive (bodies ≤ 64KB) */
  keepalive?: boolean;
}

export interface SyncStatus {
  loggedIn: boolean;
  username?: string;
  syncing: boolean;
  /** local changes waiting for upload, as of the last scan */
  pending: number;
  /** ISO time of the last successful sync */
  lastSyncAt?: string;
  /** Korean message of the last failed sync (cleared by the next success) */
  lastError?: string;
}
