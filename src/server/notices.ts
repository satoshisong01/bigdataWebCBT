/**
 * Official 빅데이터분석기사 notices, read from the 데이터자격검정(K-data) notice board's own JSON endpoints.
 * Only the official board is used, and only posts whose title names the certificate are kept,
 * so every item shown in the 🔔 panel is a first-party announcement with a link to the original.
 */
import type { OfficialNotice } from '@/lib/updates';

const BASE = 'https://www.dataq.or.kr/www';
const KEYWORD = '빅데이터분석기사';
const MAX_NOTICES = 8;
const TIMEOUT_MS = 8000;
const SUMMARY_CHARS = 160;
/** Server-side memo so the official site is asked at most once per instance per period. */
export const NOTICES_TTL_MS = 6 * 60 * 60 * 1000;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

interface RawPost {
  bbsSeq?: unknown;
  bbsKey?: unknown;
  titl?: unknown;
  cdate?: unknown;
}

const BBS_KEY = /^[A-Za-z0-9+/]+={0,2}$/;
const CDATE = /^(\d{4})\.(\d{2})\.(\d{2})$/;

/** Validates one list row; null unless it is a well-formed post about 빅데이터분석기사. */
export function toNotice(raw: unknown): OfficialNotice | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { bbsSeq, bbsKey, titl, cdate } = raw as RawPost;
  if (typeof bbsSeq !== 'number' || typeof bbsKey !== 'string' || !BBS_KEY.test(bbsKey)) return null;
  if (typeof titl !== 'string' || typeof cdate !== 'string') return null;
  const title = titl.replace(/\s+/g, ' ').trim();
  const m = CDATE.exec(cdate.trim());
  if (!title.replace(/\s/g, '').includes(KEYWORD) || !m) return null;
  return {
    id: `dataq-${bbsSeq}`,
    date: `${m[1]}-${m[2]}-${m[3]}`,
    title,
    summary: '',
    url: `${BASE}/board/view.do?bbsKey=${encodeURIComponent(bbsKey)}&boardKind=notice`,
  };
}

/** HTML body → short plain-text excerpt. */
export function plainText(html: string, max = SUMMARY_CHARS): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

async function postJson(fetchImpl: FetchLike, path: string, body: object): Promise<unknown> {
  const res = await fetchImpl(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`dataq ${path} ${res.status}`);
  return res.json();
}

function keyOf(n: OfficialNotice): string {
  return decodeURIComponent(new URL(n.url).searchParams.get('bbsKey') ?? '');
}

async function withSummary(fetchImpl: FetchLike, n: OfficialNotice): Promise<OfficialNotice> {
  try {
    const view = (await postJson(fetchImpl, '/bbs/search.dox', { bbsKey: keyOf(n), boardKind: 'notice' })) as {
      info?: { cont?: unknown; contbrief?: unknown };
    };
    const brief = typeof view.info?.contbrief === 'string' ? view.info.contbrief : '';
    const cont = typeof view.info?.cont === 'string' ? view.info.cont : '';
    return { ...n, summary: plainText(brief || cont) };
  } catch {
    return n; // the title and link are enough when the body can't be read
  }
}

/** Newest official notices about 빅데이터분석기사 (throws when the list itself can't be read). */
export async function fetchOfficialNotices(fetchImpl: FetchLike = fetch): Promise<OfficialNotice[]> {
  const list = (await postJson(fetchImpl, '/bbs/list.dox', {
    bbsattrSeq: '1',
    bbskindcd: '',
    srchWord: KEYWORD,
    currentPage: 1,
  })) as { result?: unknown; list?: unknown };
  if (list.result !== 'success' || !Array.isArray(list.list)) throw new Error('dataq list: unexpected response');
  const valid = list.list.map(toNotice).filter((n): n is OfficialNotice => n !== null);
  const unique = [...new Map(valid.map(n => [n.id, n])).values()];
  const notices = unique.sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_NOTICES);
  return Promise.all(notices.map(n => withSummary(fetchImpl, n)));
}

let memo: { at: number; data: OfficialNotice[] } | null = null;
let inflight: Promise<OfficialNotice[]> | null = null;

/** fetchOfficialNotices with a per-instance memo; a failed refresh keeps serving the last good list. */
export async function getOfficialNotices(now = Date.now(), fetchImpl: FetchLike = fetch): Promise<OfficialNotice[]> {
  if (memo && now - memo.at < NOTICES_TTL_MS) return memo.data;
  inflight ??= fetchOfficialNotices(fetchImpl)
    .then(data => {
      memo = { at: now, data };
      return data;
    })
    .catch(err => {
      if (memo) return memo.data;
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** test hook */
export function resetNoticesMemo(): void {
  memo = null;
  inflight = null;
}
