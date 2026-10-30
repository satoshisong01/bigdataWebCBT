import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOfficialNotices, getOfficialNotices, NOTICES_TTL_MS, plainText, resetNoticesMemo, toNotice } from './notices';

const KEY = 'eyJiYnNhdHRyU2VxIjoxLCJiYnNTZXEiOjU4NTEwOH0=';
const row = (over: Record<string, unknown> = {}) => ({
  bbsSeq: 585108,
  bbsKey: KEY,
  titl: '빅데이터분석기사 출제기준 개정 안내',
  cdate: '2026.09.11',
  ...over,
});

function fakeFetch(list: unknown[], view: Record<string, unknown> = { info: { cont: '<p>개정된 출제기준은&nbsp;<b>제14회</b> 필기시험부터 적용됩니다.</p>' } }) {
  return vi.fn(async (url: string) => {
    const body = url.endsWith('/bbs/list.dox') ? { result: 'success', list } : view;
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe('toNotice', () => {
  it('maps a valid row to a notice with an official link', () => {
    expect(toNotice(row())).toEqual({
      id: 'dataq-585108',
      date: '2026-09-11',
      title: '빅데이터분석기사 출제기준 개정 안내',
      summary: '',
      url: `https://www.dataq.or.kr/www/board/view.do?bbsKey=${encodeURIComponent(KEY)}&boardKind=notice`,
    });
  });
  it('keeps only posts whose title names the certificate', () => {
    expect(toNotice(row({ titl: '제63회 SQL 개발자 (SQLD) 경기 고사장 추가안내' }))).toBeNull();
    expect(toNotice(row({ titl: '제13회 빅데이터 분석기사 실기 안내' }))?.id).toBe('dataq-585108');
  });
  it('rejects malformed rows', () => {
    expect(toNotice(null)).toBeNull();
    expect(toNotice(row({ cdate: '09.11 17:57' }))).toBeNull();
    expect(toNotice(row({ bbsKey: 'javascript:alert(1)' }))).toBeNull();
    expect(toNotice(row({ bbsSeq: '585108' }))).toBeNull();
  });
});

describe('plainText', () => {
  it('strips tags and entities and trims to the limit', () => {
    expect(plainText('<p>a&nbsp;&amp;&nbsp;b</p><script>x()</script>')).toBe('a & b');
    expect(plainText('가'.repeat(200), 10)).toBe(`${'가'.repeat(10)}…`);
  });
});

describe('fetchOfficialNotices', () => {
  it('filters, de-duplicates, sorts newest first and adds summaries', async () => {
    const f = fakeFetch([
      row(),
      row({ bbsSeq: 586616, titl: '제13회 빅데이터분석기사 실기 대전, 대구 고사장 추가안내', cdate: '2026.10.28' }),
      row({ bbsSeq: 586278, titl: '제63회 SQL 개발자 (SQLD) 경기 고사장 추가안내', cdate: '2026.10.14' }),
      row(),
    ]);
    const out = await fetchOfficialNotices(f);
    expect(out.map(n => n.id)).toEqual(['dataq-586616', 'dataq-585108']);
    expect(out[1].summary).toBe('개정된 출제기준은 제14회 필기시험부터 적용됩니다.');
  });
  it('keeps a notice without summary when its body cannot be read', async () => {
    const f = vi.fn(async (url: string) =>
      url.endsWith('/bbs/list.dox')
        ? new Response(JSON.stringify({ result: 'success', list: [row()] }))
        : new Response('down', { status: 503 }),
    );
    const out = await fetchOfficialNotices(f);
    expect(out).toHaveLength(1);
    expect(out[0].summary).toBe('');
  });
  it('throws when the list is not a success response', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ result: 'fail' })));
    await expect(fetchOfficialNotices(f)).rejects.toThrow();
  });
});

describe('getOfficialNotices memo', () => {
  beforeEach(() => resetNoticesMemo());
  it('asks the official site once per TTL and serves the last good list on failure', async () => {
    const good = fakeFetch([row()]);
    const first = await getOfficialNotices(0, good);
    expect(await getOfficialNotices(NOTICES_TTL_MS - 1, good)).toBe(first);
    expect(good).toHaveBeenCalledTimes(2); // list + one body

    const broken = vi.fn(async () => new Response('down', { status: 503 }));
    expect(await getOfficialNotices(NOTICES_TTL_MS + 1, broken)).toEqual(first);
  });
  it('propagates the error when nothing was ever fetched', async () => {
    const broken = vi.fn(async () => new Response('down', { status: 503 }));
    await expect(getOfficialNotices(0, broken)).rejects.toThrow();
  });
});
