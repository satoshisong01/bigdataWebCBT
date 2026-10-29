import type { NextRequest, NextResponse } from 'next/server';
import type { MeData } from '@/lib/sync/protocol';
import { guard, ok, rateLimit } from '@/server/http';
import { sessionLimiter } from '@/server/rate-limit';
import { requireSession, withRenewal } from '@/server/route-session';

export const runtime = 'nodejs';
/** Per-request auth state: never prerendered or cached (responses also carry no-store). */
export const dynamic = 'force-dynamic';

/** GET → MeData, or 401 when the cookie names no live session (docs §7.2). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return guard('api/auth/me', async () => {
    const limited = rateLimit(sessionLimiter, req);
    if (limited) return limited;
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const data: MeData = { userId: auth.session.userId, username: auth.session.username };
    return withRenewal(ok(data), auth);
  });
}
