/**
 * Server-only: session cookie plumbing for the Route Handlers (docs §7.2).
 */
import type { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/sync/protocol';
import { getDb } from './db';
import { MSG, fail } from './http';
import { clearedCookieOptions, isProduction, isWellFormedToken, sessionCookieOptions } from './session';
import { resolveSession } from './session-store';
import type { ResolvedSession } from './session-store';

export interface AuthedRequest {
  session: ResolvedSession;
  token: string;
}

export type SessionGate = ({ ok: true } & AuthedRequest) | { ok: false; response: NextResponse };

export function readSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION_COOKIE)?.value;
}

export function setSessionCookie<R extends NextResponse>(res: R, token: string, persistent: boolean): R {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(persistent, isProduction()));
  return res;
}

export function clearSessionCookie<R extends NextResponse>(res: R): R {
  res.cookies.set(SESSION_COOKIE, '', clearedCookieOptions(isProduction()));
  return res;
}

/** 401 (clearing a stale cookie) unless the cookie names a live session; malformed tokens skip the DB. */
export async function requireSession(req: NextRequest): Promise<SessionGate> {
  const token = readSessionToken(req);
  const session = isWellFormedToken(token) ? await resolveSession(getDb(), token) : null;
  if (!session || token === undefined) {
    const res = fail(401, MSG.unauthorized);
    return { ok: false, response: token === undefined ? res : clearSessionCookie(res) };
  }
  return { ok: true, session, token };
}

/** After a sliding renewal the 400-day cookie is re-sent so the browser-side expiry moves too. */
export function withRenewal<R extends NextResponse>(res: R, auth: AuthedRequest): R {
  return auth.session.renewed ? setSessionCookie(res, auth.token, true) : res;
}
