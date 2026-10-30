import { NextResponse } from 'next/server';
import type { ApiResult } from '@/lib/sync/protocol';
import type { OfficialNotice } from '@/lib/updates';
import { logServerError } from '@/server/http';
import { getOfficialNotices } from '@/server/notices';

export const runtime = 'nodejs';
/** Fetched at request time (never at build), then cached by the CDN via Cache-Control below. */
export const dynamic = 'force-dynamic';

/**
 * Browsers keep a list for 5 minutes (page-to-page navigation reuses it); Vercel's CDN keeps it for
 * 6 hours via the CDN-only header, so the official site is asked a few times a day at most.
 * stale-while-revalidate stays CDN-only — in a browser it would trigger background refetches.
 */
const CACHE_OK = { 'Cache-Control': 'public, max-age=300', 'Vercel-CDN-Cache-Control': 'max-age=21600, stale-while-revalidate=86400' };
const CACHE_FAIL = { 'Cache-Control': 'public, max-age=60', 'Vercel-CDN-Cache-Control': 'max-age=300' };

/** GET → the newest official 빅데이터분석기사 notices from 데이터자격검정 (public, no auth). */
export async function GET(): Promise<NextResponse<ApiResult<OfficialNotice[]>>> {
  try {
    const notices = await getOfficialNotices();
    return NextResponse.json({ ok: true, data: notices }, { headers: CACHE_OK });
  } catch (err) {
    logServerError('api/notices', err);
    return NextResponse.json(
      { ok: false, error: '공식 공지를 불러오지 못했어요' },
      { status: 502, headers: CACHE_FAIL },
    );
  }
}
