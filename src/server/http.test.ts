// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MSG, clientIp, fail, guard, isJsonContentType, ok, rateLimit, readJsonBody } from './http';
import { createRateLimiter } from './rate-limit';

const URL_ = 'http://localhost/api/test';

function post(body: BodyInit | null, headers: Record<string, string> = { 'content-type': 'application/json' }): Request {
  return new Request(URL_, { method: 'POST', headers, body });
}

function streamed(chunks: string[]): Request {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' };
  return new Request(URL_, init as RequestInit);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('response envelope', () => {
  it('ok() wraps data and forbids caching (including Service Worker Cache Storage)', async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('vary')).toBe('*');
  });

  it('fail() carries status, a message and extra headers', async () => {
    const res = fail(429, MSG.rateLimited, { 'Retry-After': '30' });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: MSG.rateLimited });
    expect(res.headers.get('retry-after')).toBe('30');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('isJsonContentType', () => {
  it.each([
    ['application/json', true],
    ['application/json; charset=utf-8', true],
    ['Application/JSON', true],
    ['text/plain', false],
    ['application/jsonx', false],
    ['multipart/form-data; boundary=x', false],
    [null, false],
  ])('%j → %s', (value, expected) => {
    expect(isJsonContentType(value)).toBe(expected);
  });
});

describe('readJsonBody', () => {
  it('415 for a non-JSON content type (form posts cannot forge it)', async () => {
    const result = await readJsonBody(post('{}', { 'content-type': 'text/plain' }), 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it('413 when the declared length is over the limit', async () => {
    const result = await readJsonBody(post('{}', { 'content-type': 'application/json', 'content-length': '5000' }), 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it('413 when a streamed body without length grows past the limit', async () => {
    const result = await readJsonBody(streamed(['{"a":"', 'x'.repeat(80), 'y'.repeat(80), '"}']), 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it('accepts a body of exactly the limit', async () => {
    const text = JSON.stringify({ a: 'x'.repeat(92) });
    expect(Buffer.byteLength(text)).toBe(100);
    expect(await readJsonBody(post(text), 100)).toEqual({ ok: true, body: { a: 'x'.repeat(92) } });
  });

  it.each(['{"a":', '', 'undefined'])('400 for malformed JSON %j', async (text) => {
    const result = await readJsonBody(post(text), 100);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect(await result.response.json()).toEqual({ ok: false, error: MSG.badRequest });
    }
  });

  it('decodes a UTF-8 character split across chunks', async () => {
    const bytes = Buffer.from(JSON.stringify({ t: '합격' }), 'utf8');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 8)); // ends inside the 3-byte '합'
        controller.enqueue(bytes.subarray(8));
        controller.close();
      },
    });
    const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' };
    expect(await readJsonBody(new Request(URL_, init as RequestInit), 100)).toEqual({ ok: true, body: { t: '합격' } });
  });
});

describe('clientIp / rateLimit', () => {
  it('uses the right-most x-forwarded-for hop (written by our proxy), then x-real-ip', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': ' 198.51.100.7 , 10.0.0.1' }))).toBe('10.0.0.1');
    expect(clientIp(new Headers({ 'x-forwarded-for': 'spoofed-1, 198.51.100.9, ' }))).toBe('198.51.100.9');
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.8' }))).toBe('198.51.100.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });

  it('returns 429 with Retry-After once the IP is over budget', async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const req = post('{}', { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' });
    expect(rateLimit(limiter, req)).toBeNull();
    const limited = rateLimit(limiter, req);
    expect(limited?.status).toBe(429);
    expect(Number(limited?.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await limited?.json()).toEqual({ ok: false, error: MSG.rateLimited });
  });
});

describe('guard', () => {
  it('turns unexpected errors into a generic 500 and logs them redacted', async () => {
    vi.stubEnv('DB_PASS', 'not-a-real-secret-123');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await guard('api/test', async () => {
      throw new Error('connect failed with not-a-real-secret-123 to 203.0.113.10');
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: MSG.server });
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('[api/test]');
    expect(logged).not.toContain('not-a-real-secret-123');
    expect(logged).not.toContain('203.0.113.10');
  });

  it('passes successful responses through', async () => {
    const res = await guard('api/test', async () => ok('fine'));
    expect(await res.json()).toEqual({ ok: true, data: 'fine' });
  });
});
