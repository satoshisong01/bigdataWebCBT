/**
 * Server-only: the `{ ok, data } / { ok, error }` envelope and request guards used by every API
 * Route Handler (docs §7.1). User-facing messages are Korean and never carry internals.
 */
import { NextResponse } from 'next/server';
import type { ApiResult } from '@/lib/sync/protocol';
import { describeError } from './env';
import type { RateLimiter } from './rate-limit';

export const MSG = {
  badRequest: '요청 형식이 올바르지 않습니다',
  unsupportedType: '요청 형식이 올바르지 않습니다 (Content-Type: application/json 필요)',
  tooLarge: '요청 데이터가 너무 큽니다',
  rateLimited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
  unauthorized: '로그인이 필요합니다',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요',
} as const;

/**
 * `no-store` keeps HTTP caches out. `Vary: *` additionally makes Cache Storage `put()` reject,
 * so a Service Worker can never persist an auth/sync response either.
 */
const API_HEADERS: Readonly<Record<string, string>> = { 'Cache-Control': 'no-store', Vary: '*' };

export function ok<T>(data: T): NextResponse<ApiResult<T>> {
  const body: ApiResult<T> = { ok: true, data };
  return NextResponse.json(body, { headers: API_HEADERS });
}

export function fail(
  status: number,
  error: string,
  extraHeaders: Readonly<Record<string, string>> = {},
): NextResponse<ApiResult<never>> {
  const body: ApiResult<never> = { ok: false, error };
  return NextResponse.json(body, { status, headers: { ...API_HEADERS, ...extraHeaders } });
}

export function isJsonContentType(value: string | null): boolean {
  return value !== null && value.split(';')[0].trim().toLowerCase() === 'application/json';
}

/** 415 unless the request declares JSON — a CSRF backstop for cookie-authenticated POSTs. */
export function requireJsonContentType(req: Request): NextResponse | null {
  return isJsonContentType(req.headers.get('content-type')) ? null : fail(415, MSG.unsupportedType);
}

export type JsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/** Reads at most maxBytes (declared or streamed), so a chunked upload cannot exceed the cap. */
async function readTextWithin(req: Request, maxBytes: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** 415 / 413 / 400 as a ready response, otherwise the parsed JSON body. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<JsonBodyResult> {
  const badType = requireJsonContentType(req);
  if (badType) return { ok: false, response: badType };
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: fail(413, MSG.tooLarge) };
  const text = await readTextWithin(req, maxBytes);
  if (text === null) return { ok: false, response: fail(413, MSG.tooLarge) };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: fail(400, MSG.badRequest) };
  }
}

/**
 * Right-most x-forwarded-for entry, then x-real-ip. The right-most entry is the one written by the
 * proxy in front of us (Vercel sets the header to the client IP; an appending proxy adds the peer
 * it saw), so a client-supplied XFF prefix cannot mint a fresh rate-limit key per request.
 * Assumes the app runs behind such a proxy (docs §7.7: Vercel); without one, headers are spoofable.
 */
export function clientIp(headers: Headers): string {
  const hops = headers.get('x-forwarded-for')?.split(',').map((hop) => hop.trim()).filter(Boolean) ?? [];
  const forwarded = hops[hops.length - 1];
  if (forwarded) return forwarded;
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** 429 with Retry-After once the client IP exceeds the limiter's window budget. */
export function rateLimit(limiter: RateLimiter, req: Request): NextResponse | null {
  const decision = limiter.hit(clientIp(req.headers));
  if (decision.allowed) return null;
  return fail(429, MSG.rateLimited, { 'Retry-After': String(decision.retryAfterSec) });
}

export function logServerError(scope: string, err: unknown): void {
  console.error(`[${scope}]`, describeError(err));
}

/** Runs a handler; unexpected errors are logged (redacted) and answered with a generic 500. */
export async function guard(scope: string, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    logServerError(scope, err);
    return fail(500, MSG.server);
  }
}
