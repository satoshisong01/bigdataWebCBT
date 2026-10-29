import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_MSG, changePassword } from '@/server/auth';
import type { PasswordChangeResult } from '@/server/auth';
import { AUTH_BODY_LIMIT_BYTES, parseChangePasswordRequest } from '@/server/auth-input';
import { getDb } from '@/server/db';
import { MSG, fail, guard, ok, rateLimit, readJsonBody, requireJsonContentType } from '@/server/http';
import { authLimiter } from '@/server/rate-limit';
import { requireSession, withRenewal } from '@/server/route-session';

export const runtime = 'nodejs';

/** Wrong current password is 400, not 401: the session itself is still valid. */
function toResponse(result: PasswordChangeResult): NextResponse {
  switch (result.kind) {
    case 'ok':
      return ok(null);
    case 'weak':
      return fail(400, AUTH_MSG.weakPassword);
    case 'locked':
      return fail(429, AUTH_MSG.locked);
    case 'invalid':
      return fail(400, AUTH_MSG.wrongCurrent);
  }
}

/** POST {current, next} → new password; every other session of the account is revoked (docs §7.2). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return guard('api/auth/password', async () => {
    const limited = rateLimit(authLimiter, req);
    if (limited) return limited;
    const badType = requireJsonContentType(req);
    if (badType) return badType;
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(req, AUTH_BODY_LIMIT_BYTES);
    if (!body.ok) return withRenewal(body.response, auth);
    const input = parseChangePasswordRequest(body.body);
    if (!input) return withRenewal(fail(400, MSG.badRequest), auth);

    const result = await changePassword(getDb(), auth.session, input.current, input.next);
    return withRenewal(toResponse(result), auth);
  });
}
