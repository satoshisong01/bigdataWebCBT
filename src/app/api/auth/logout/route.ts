import type { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { MSG, fail, guard, logServerError, ok, rateLimit, requireJsonContentType } from '@/server/http';
import { sessionLimiter } from '@/server/rate-limit';
import { clearSessionCookie, readSessionToken } from '@/server/route-session';
import { isWellFormedToken } from '@/server/session';
import { deleteSession } from '@/server/session-store';

export const runtime = 'nodejs';

/** POST → deletes the session row and always clears the cookie (docs §7.2). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return guard('api/auth/logout', async () => {
    const limited = rateLimit(sessionLimiter, req);
    if (limited) return limited;
    const badType = requireJsonContentType(req);
    if (badType) return badType;

    const token = readSessionToken(req);
    if (isWellFormedToken(token)) {
      try {
        await deleteSession(getDb(), token);
      } catch (err) {
        logServerError('api/auth/logout', err);
        return clearSessionCookie(fail(500, MSG.server));
      }
    }
    return clearSessionCookie(ok(null));
  });
}
