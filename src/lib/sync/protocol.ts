/**
 * CONTRACT — wire format shared by the sync/auth Route Handlers (src/server, src/app/api) and the
 * client engine (src/lib/sync, src/lib/auth.ts). See docs/2027-study-overhaul.md §7.
 * Pure types/constants only: safe to import from both server and client code.
 */

export const SYNC_NAMESPACES = [
  'qstat',
  'cstat',
  'activity',
  'mock',
  'history',
  'wrong',
  'retry',
  'answers',
  'bookmark',
  'studyday',
  'settings',
] as const;

export type SyncNs = (typeof SYNC_NAMESPACES)[number];

export function isSyncNs(v: unknown): v is SyncNs {
  return typeof v === 'string' && (SYNC_NAMESPACES as readonly string[]).includes(v);
}

export interface SyncChange {
  ns: SyncNs;
  /** 1..160 chars */
  key: string;
  /** JSON value; null = deleted (tombstone) */
  value: unknown;
  /** ISO timestamp chosen by the writer (LWW clock) */
  updatedAt: string;
}

export interface SyncRequest {
  /** 1..64 chars [A-Za-z0-9_-] */
  device: string;
  /** decimal bigint as string; '0' on first sync */
  cursor: string;
  /** at most SYNC_LIMITS.maxChanges */
  changes: SyncChange[];
}

export interface RemoteChange extends SyncChange {
  device: string;
}

export interface SyncResponseData {
  cursor: string;
  changes: RemoteChange[];
  /** more server changes are waiting after `cursor` */
  more: boolean;
  /** how many of the request's changes were stored */
  accepted: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface MeData {
  userId: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  /** "로그인 상태 유지" — persistent 400-day cookie when true, browser-session cookie when false */
  remember: boolean;
}

export interface ChangePasswordRequest {
  current: string;
  next: string;
}

export const SYNC_LIMITS = {
  maxChanges: 2000,
  maxKeyLength: 160,
  maxValueBytes: 64 * 1024,
  maxBodyBytes: 1_500_000,
  pageSize: 3000,
  /** writer clocks more than this far in the future are clamped to server now */
  maxFutureSkewMs: 5 * 60 * 1000,
} as const;

export const SESSION_COOKIE = 'bigdata_session';
/** Browsers cap cookie lifetime at 400 days. */
export const PERSISTENT_SESSION_DAYS = 400;
export const BROWSER_SESSION_DAYS = 1;

export const API_ROUTES = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  password: '/api/auth/password',
  sync: '/api/sync',
} as const;
