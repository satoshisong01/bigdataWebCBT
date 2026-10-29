/**
 * Server-only, PURE: shape checks for the auth request bodies. Field caps only bound the work;
 * the real rules (username format, 6..72-char passwords) are applied by auth.ts.
 */
import type { ChangePasswordRequest, LoginRequest } from '@/lib/sync/protocol';

export const AUTH_BODY_LIMIT_BYTES = 4096;
const MAX_FIELD_LENGTH = 256;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFilled(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_FIELD_LENGTH;
}

/** `remember` defaults to true ("로그인 상태 유지" is on by default). */
export function parseLoginRequest(body: unknown): LoginRequest | null {
  if (!isRecord(body)) return null;
  const { username, password, remember } = body;
  if (!isFilled(username) || !isFilled(password)) return null;
  if (remember !== undefined && typeof remember !== 'boolean') return null;
  return { username, password, remember: remember ?? true };
}

/** `next` may be any string here so a too-short one gets the specific 6..72 message. */
export function parseChangePasswordRequest(body: unknown): ChangePasswordRequest | null {
  if (!isRecord(body)) return null;
  const { current, next } = body;
  if (!isFilled(current) || typeof next !== 'string' || next.length > MAX_FIELD_LENGTH) return null;
  return { current, next };
}
