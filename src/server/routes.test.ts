// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as password } from '@/app/api/auth/password/route';
import { POST as sync } from '@/app/api/sync/route';
import { SESSION_COOKIE } from '@/lib/sync/protocol';
import { MSG } from './http';

// Every path below must answer before any DB access.
vi.mock('@/server/db', () => ({
  getDb: () => {
    throw new Error('the DB must not be touched on this path');
  },
}));

let ipCounter = 0;

interface Options {
  method?: 'GET' | 'POST';
  contentType?: string | null;
  body?: string;
  cookie?: string;
  ip?: string;
}

function makeRequest(path: string, { method = 'POST', contentType = 'application/json', body, cookie, ip }: Options = {}): NextRequest {
  ipCounter += 1;
  const headers = new Headers({ 'x-forwarded-for': ip ?? `192.0.2.${ipCounter}` });
  if (contentType) headers.set('content-type', contentType);
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(`http://localhost${path}`, { method, headers, body: method === 'POST' ? (body ?? '{}') : undefined });
}

describe('POST /api/auth/login (no DB needed)', () => {
  it('415 unless the body is declared JSON', async () => {
    const res = await login(makeRequest('/api/auth/login', { contentType: 'text/plain' }));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ ok: false, error: MSG.unsupportedType });
  });

  it('413 over 4 KB', async () => {
    const res = await login(makeRequest('/api/auth/login', { body: JSON.stringify({ username: 'x'.repeat(5000) }) }));
    expect(res.status).toBe(413);
  });

  it.each(['{"username":', '{"username":"alice"}', '{"username":"alice","password":"pw-123","remember":"yes"}'])(
    '400 for %s',
    async (body) => {
      const res = await login(makeRequest('/api/auth/login', { body }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: MSG.badRequest });
    },
  );

  it('429 after 20 requests per minute from one IP', async () => {
    const ip = '198.51.100.20';
    for (let i = 0; i < 20; i += 1) {
      expect((await login(makeRequest('/api/auth/login', { contentType: 'text/plain', ip }))).status).toBe(415);
    }
    const limited = await login(makeRequest('/api/auth/login', { ip }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('session-protected routes without a usable cookie', () => {
  it('GET /api/auth/me → 401, uncacheable', async () => {
    const res = await me(makeRequest('/api/auth/me', { method: 'GET', contentType: null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: MSG.unauthorized });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('a malformed session cookie → 401 and the cookie is cleared', async () => {
    const res = await me(makeRequest('/api/auth/me', { method: 'GET', contentType: null, cookie: `${SESSION_COOKIE}=forged` }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('POST /api/sync → 415 before auth, then 401', async () => {
    expect((await sync(makeRequest('/api/sync', { contentType: 'text/plain' }))).status).toBe(415);
    const res = await sync(makeRequest('/api/sync', { body: JSON.stringify({ device: 'pc', cursor: '0', changes: [] }) }));
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/password → 401', async () => {
    const res = await password(makeRequest('/api/auth/password', { body: JSON.stringify({ current: 'a', next: 'b' }) }));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('415 without a JSON content type', async () => {
    expect((await logout(makeRequest('/api/auth/logout', { contentType: null }))).status).toBe(415);
  });

  it('clears the cookie even when there is no session', async () => {
    const res = await logout(makeRequest('/api/auth/logout'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: null });
    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`);
  });
});
