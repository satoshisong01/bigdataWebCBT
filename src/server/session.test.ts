// @vitest-environment node
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_COOKIE } from '@/lib/sync/protocol';
import { clearSessionCookie, setSessionCookie } from './route-session';
import {
  DAY_MS,
  clearedCookieOptions,
  hashSessionToken,
  isProduction,
  isWellFormedToken,
  newSessionToken,
  sessionCookieOptions,
  sessionDays,
  shouldRenew,
} from './session';

const PERSISTENT_SECONDS = 400 * 86_400;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('session tokens', () => {
  it('are 32 random bytes as base64url; only their sha256 hex is stored', () => {
    const { token, tokenHash } = newSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(tokenHash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(tokenHash);
    expect(newSessionToken().token).not.toBe(token);
  });

  it.each([
    [undefined, false],
    ['', false],
    ['a'.repeat(43), true],
    ['a'.repeat(42), false],
    ['a'.repeat(44), false],
    [`${'a'.repeat(42)}=`, false],
    [`${'a'.repeat(42)}.`, false],
  ])('isWellFormedToken(%j) → %s', (token, expected) => {
    expect(isWellFormedToken(token)).toBe(expected);
  });
});

describe('lifetimes and cookie options', () => {
  it('persistent = 400 days, browser session = 1 day', () => {
    expect(sessionDays(true)).toBe(400);
    expect(sessionDays(false)).toBe(1);
  });

  it('persistent cookies get Max-Age 400 days; browser-session cookies none', () => {
    expect(sessionCookieOptions(true, false)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: PERSISTENT_SECONDS,
    });
    expect(sessionCookieOptions(false, true)).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: true });
    expect(clearedCookieOptions(true)).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 0 });
  });

  it('Secure follows NODE_ENV=production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isProduction()).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    expect(isProduction()).toBe(false);
  });
});

describe('Set-Cookie headers', () => {
  const token = 'T'.repeat(43);

  it('persistent: HttpOnly, SameSite=Lax, Path=/, Max-Age=400d (Secure only in production)', () => {
    const dev = setSessionCookie(NextResponse.json({}), token, true).headers.get('set-cookie') ?? '';
    expect(dev).toContain(`${SESSION_COOKIE}=${token}`);
    expect(dev).toMatch(/HttpOnly/i);
    expect(dev).toMatch(/SameSite=Lax/i);
    expect(dev).toMatch(/Path=\//);
    expect(dev).toContain(`Max-Age=${PERSISTENT_SECONDS}`);
    expect(dev).not.toMatch(/Secure/i);

    vi.stubEnv('NODE_ENV', 'production');
    const prod = setSessionCookie(NextResponse.json({}), token, true).headers.get('set-cookie') ?? '';
    expect(prod).toMatch(/Secure/i);
  });

  it('browser session: no Max-Age and no Expires', () => {
    const header = setSessionCookie(NextResponse.json({}), token, false).headers.get('set-cookie') ?? '';
    expect(header).toContain(`${SESSION_COOKIE}=${token}`);
    expect(header).not.toMatch(/Max-Age|Expires/i);
  });

  it('clearing sets an empty value with Max-Age=0 on the same path', () => {
    const header = clearSessionCookie(NextResponse.json({})).headers.get('set-cookie') ?? '';
    expect(header).toContain(`${SESSION_COOKIE}=;`);
    expect(header).toContain('Max-Age=0');
    expect(header).toMatch(/Path=\//);
  });
});

describe('shouldRenew (sliding 400-day sessions)', () => {
  const now = new Date('2026-10-29T12:00:00.000Z');
  const at = (ms: number): Date => new Date(now.getTime() + ms);

  it('never renews browser-session rows', () => {
    expect(shouldRenew(false, at(-DAY_MS), now)).toBe(false);
  });

  it('renews only when the last extension (expires_at − 400d) is more than a day old', () => {
    expect(shouldRenew(true, at(400 * DAY_MS), now)).toBe(false);
    expect(shouldRenew(true, at(399 * DAY_MS + 1), now)).toBe(false);
    expect(shouldRenew(true, at(399 * DAY_MS - 1), now)).toBe(true);
    expect(shouldRenew(true, at(30 * DAY_MS), now)).toBe(true);
  });
});
