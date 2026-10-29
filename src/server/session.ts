/**
 * Server-only: session tokens, cookie options and expiry rules (docs §7.2).
 * The raw 32-byte token exists only in the HttpOnly cookie; the DB keeps sha256(token).
 */
import { createHash, randomBytes } from 'node:crypto';
import { BROWSER_SESSION_DAYS, PERSISTENT_SESSION_DAYS } from '@/lib/sync/protocol';

export const DAY_MS = 86_400_000;
const DAY_SECONDS = 86_400;
const TOKEN_BYTES = 32;
/** 32 bytes as unpadded base64url */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export interface SessionToken {
  token: string;
  tokenHash: string;
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  path: '/';
  secure: boolean;
  /** seconds; absent = browser-session cookie */
  maxAge?: number;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newSessionToken(): SessionToken {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashSessionToken(token) };
}

export function isWellFormedToken(token: string | undefined): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/** DB lifetime: 400 days for "로그인 상태 유지", otherwise 1 day. */
export function sessionDays(persistent: boolean): number {
  return persistent ? PERSISTENT_SESSION_DAYS : BROWSER_SESSION_DAYS;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Persistent → Max-Age 400 days; otherwise no Max-Age, so the browser drops it when closed. */
export function sessionCookieOptions(persistent: boolean, secure: boolean): SessionCookieOptions {
  const base: SessionCookieOptions = { httpOnly: true, sameSite: 'lax', path: '/', secure };
  return persistent ? { ...base, maxAge: PERSISTENT_SESSION_DAYS * DAY_SECONDS } : base;
}

export function clearedCookieOptions(secure: boolean): SessionCookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: 0 };
}

/**
 * Sliding renewal for persistent sessions: every extension sets expires_at = t + 400 days, so the
 * last extension happened at expires_at − 400 days. Renew once that is more than a day ago.
 */
export function shouldRenew(persistent: boolean, expiresAt: Date, now: Date): boolean {
  if (!persistent) return false;
  const extendedAt = expiresAt.getTime() - PERSISTENT_SESSION_DAYS * DAY_MS;
  return now.getTime() - extendedAt > DAY_MS;
}
