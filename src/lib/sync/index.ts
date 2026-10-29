/** Public entry of the sync client (docs §7.5): `import { syncNow, login, SYNC_EVENT } from '@/lib/sync'`. */
export {
  SYNC_EVENT, SYNC_STATUS_EVENT, createSyncEngine, getSyncEngine, getSyncStatus, startAutoSync, syncNow,
} from './engine';
export type {
  SyncDeps, SyncEngine, SyncEventDetail, SyncOptions, SyncResult, SyncSkipReason, SyncStatus,
} from './engine';
export {
  changePassword, clearSavedUsername, getAuthState, getSavedUsername, login, logout, setSavedUsername, verifyAuth,
} from '../auth';
export type { AuthResult, AuthState, LoginResult } from '../auth';
