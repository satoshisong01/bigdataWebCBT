import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_MSG, attemptLogin } from '@/server/auth';
import { AUTH_BODY_LIMIT_BYTES, parseLoginRequest } from '@/server/auth-input';
import { getDb } from '@/server/db';
import { MSG, fail, guard, ok, rateLimit, readJsonBody } from '@/server/http';
import { authLimiter } from '@/server/rate-limit';
import { readSessionToken, setSessionCookie } from '@/server/route-session';
import { isWellFormedToken } from '@/server/session';
import { createSession, deleteSession } from '@/server/session-store';

export const runtime = 'nodejs';

/** POST {username, password, remember} → MeData + session cookie (docs §7.2). No signup route. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return guard('api/auth/login', async () => {
    const limited = rateLimit(authLimiter, req);
    if (limited) return limited;
    const body = await readJsonBody(req, AUTH_BODY_LIMIT_BYTES);
    if (!body.ok) return body.response;
    const input = parseLoginRequest(body.body);
    if (!input) return fail(400, MSG.badRequest);

    const db = getDb();
    const result = await attemptLogin(db, input.username, input.password);
    if (result.kind === 'locked') return fail(429, AUTH_MSG.locked);
    if (result.kind === 'invalid') return fail(401, AUTH_MSG.invalid);

    const previous = readSessionToken(req);
    if (isWellFormedToken(previous)) await deleteSession(db, previous);
    const token = await createSession(db, result.user.userId, input.remember);
    return setSessionCookie(ok(result.user), token, input.remember);
  });
}
