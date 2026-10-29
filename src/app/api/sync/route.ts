import type { NextRequest, NextResponse } from 'next/server';
import { SYNC_LIMITS } from '@/lib/sync/protocol';
import { getDb } from '@/server/db';
import { fail, guard, logServerError, ok, rateLimit, readJsonBody, requireJsonContentType } from '@/server/http';
import { syncLimiter } from '@/server/rate-limit';
import { requireSession, withRenewal } from '@/server/route-session';
import { SYNC_MSG, parseSyncRequest } from '@/server/sync-plan';
import { isPayloadError, runSync } from '@/server/sync-store';

export const runtime = 'nodejs';

/**
 * POST SyncRequest → SyncResponseData (docs §7.3). The cookie is checked before the up-to-1.5 MB
 * body is read, so anonymous callers cost neither bandwidth nor a DB round trip.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return guard('api/sync', async () => {
    const limited = rateLimit(syncLimiter, req);
    if (limited) return limited;
    const badType = requireJsonContentType(req);
    if (badType) return badType;
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(req, SYNC_LIMITS.maxBodyBytes);
    if (!body.ok) return withRenewal(body.response, auth);
    const parsed = parseSyncRequest(body.body);
    if (!parsed.ok) return withRenewal(fail(400, parsed.error), auth);

    try {
      const data = await runSync(getDb(), auth.session.userId, parsed.value, new Date());
      return withRenewal(ok(data), auth);
    } catch (err) {
      if (!isPayloadError(err)) throw err;
      logServerError('api/sync', err);
      return withRenewal(fail(400, SYNC_MSG.unstorable), auth);
    }
  });
}
