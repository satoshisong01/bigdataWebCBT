// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SYNC_LIMITS } from '@/lib/sync/protocol';
import type { SyncChange } from '@/lib/sync/protocol';
import {
  SYNC_MSG,
  buildSyncResponse,
  clampUpdatedAt,
  isValidCursor,
  parseIsoMs,
  parseSyncRequest,
  planChanges,
  takePage,
} from './sync-plan';
import type { StoredRecord } from './sync-plan';

const T1 = '2026-10-01T00:00:00.000Z';
const T2 = '2026-10-02T00:00:00.000Z';
const NOW = Date.parse('2026-10-29T12:00:00.000Z');

function change(over: Partial<Record<keyof SyncChange, unknown>> = {}): Record<string, unknown> {
  return { ns: 'qstat', key: 'q1', value: { a: 1 }, updatedAt: T1, ...over };
}

function request(changes: unknown[], over: Record<string, unknown> = {}): Record<string, unknown> {
  return { device: 'pc-1', cursor: '0', changes, ...over };
}

function errorOf(body: unknown): string | null {
  const parsed = parseSyncRequest(body);
  return parsed.ok ? null : parsed.error;
}

function row(key: string, version: number, value: unknown = { n: version }): StoredRecord {
  return { ns: 'activity', key, value, updatedAt: T1, device: 'pc-1', version: String(version) };
}

describe('parseSyncRequest', () => {
  it('accepts a well-formed request (null value = tombstone)', () => {
    const body = request([change(), change({ ns: 'bookmark', key: 'b1', value: null })]);
    expect(parseSyncRequest(body)).toEqual({ ok: true, value: body });
  });

  it.each([null, [], 'x'])('rejects a non-object body %j', (body) => {
    expect(errorOf(body)).toBe(`${SYNC_MSG.invalid} (body)`);
  });

  it.each(['', 'a'.repeat(65), 'pc 1', 'pc/1', 7])('rejects device %j', (device) => {
    expect(errorOf(request([], { device }))).toBe(`${SYNC_MSG.invalid} (device)`);
  });

  it.each(['', '01', '-1', '1.5', '9223372036854775808', 0, null])('rejects cursor %j', (cursor) => {
    expect(errorOf(request([], { cursor }))).toBe(`${SYNC_MSG.invalid} (cursor)`);
  });

  it('accepts the largest bigint cursor and a 64-char device', () => {
    expect(errorOf(request([], { cursor: '9223372036854775807', device: 'd'.repeat(64) }))).toBeNull();
  });

  it(`allows at most ${SYNC_LIMITS.maxChanges} changes`, () => {
    const many = Array.from({ length: SYNC_LIMITS.maxChanges }, (_, i) => change({ key: `k${i}` }));
    expect(errorOf(request(many))).toBeNull();
    expect(errorOf(request([...many, change({ key: 'one-more' })]))).toBe(SYNC_MSG.tooMany);
    expect(errorOf(request({ length: 1 } as unknown as unknown[]))).toBe(`${SYNC_MSG.invalid} (changes)`);
  });

  it.each([
    [change({ ns: 'theme' }), 'changes[1].ns'],
    [change({ key: '' }), 'changes[1].key'],
    [change({ key: 'k'.repeat(SYNC_LIMITS.maxKeyLength + 1) }), 'changes[1].key'],
    [change({ key: 'a\u0000b' }), 'changes[1].key'],
    [change({ key: 5 }), 'changes[1].key'],
    [change({ value: undefined }), 'changes[1].value'],
    [change({ value: { s: 'x\u0000y' } }), 'changes[1].value'],
    [change({ value: 'x'.repeat(SYNC_LIMITS.maxValueBytes) }), 'changes[1].value'],
    [change({ updatedAt: 'yesterday' }), 'changes[1].updatedAt'],
    [change({ updatedAt: '2026-10-29' }), 'changes[1].updatedAt'],
    [change({ updatedAt: '2026-13-01T00:00:00Z' }), 'changes[1].updatedAt'],
    [change({ updatedAt: '1969-12-31T23:59:59.999Z' }), 'changes[1].updatedAt'],
    ['not-a-change', 'changes[1]'],
  ])('rejects an invalid change %#', (bad, field) => {
    expect(errorOf(request([change(), bad]))).toBe(`${SYNC_MSG.invalid} (${field})`);
  });

  it('accepts boundary sizes, offsets, microseconds and a literal backslash-u0000 text', () => {
    const exact = 'x'.repeat(SYNC_LIMITS.maxValueBytes - 2); // JSON string quotes make it exactly 64 KB
    const body = request([
      change({ key: 'k'.repeat(SYNC_LIMITS.maxKeyLength) }),
      change({ key: 'big', value: exact }),
      change({ key: 'tz', updatedAt: '2026-10-29T21:00:00+09:00' }),
      change({ key: 'us', updatedAt: '2026-10-29T12:00:00.123456Z' }),
      change({ key: 'text', value: { s: 'backslash-u: \\u0000' } }),
      change({ key: 'epoch', updatedAt: '1970-01-01T00:00:00.000Z' }),
    ]);
    expect(errorOf(body)).toBeNull();
  });
});

describe('small validators', () => {
  it('isValidCursor / parseIsoMs', () => {
    expect(isValidCursor('0')).toBe(true);
    expect(isValidCursor('123')).toBe(true);
    expect(isValidCursor('00')).toBe(false);
    expect(parseIsoMs('1970-01-01T00:00:00Z')).toBe(0);
    expect(parseIsoMs('2026-10-29T21:00:00+09:00')).toBe(Date.parse('2026-10-29T12:00:00Z'));
    expect(parseIsoMs(12345)).toBeNull();
  });
});

describe('planChanges', () => {
  const asChange = (over: Partial<Record<keyof SyncChange, unknown>>): SyncChange => change(over) as unknown as SyncChange;

  it('clamps clocks more than 5 minutes ahead to now and normalizes to UTC ISO', () => {
    const edge = new Date(NOW + SYNC_LIMITS.maxFutureSkewMs).toISOString();
    expect(clampUpdatedAt(edge, NOW)).toBe(edge);
    expect(clampUpdatedAt(new Date(NOW + SYNC_LIMITS.maxFutureSkewMs + 1).toISOString(), NOW)).toBe(
      new Date(NOW).toISOString(),
    );
    expect(clampUpdatedAt('2026-10-29T21:00:00+09:00', NOW)).toBe('2026-10-29T12:00:00.000Z');
  });

  it('serializes values once; null stays a tombstone', () => {
    expect(planChanges([asChange({ value: { a: [1, 'x'] } }), asChange({ key: 'q2', value: null })], NOW)).toEqual([
      { ns: 'qstat', key: 'q1', json: '{"a":[1,"x"]}', updatedAt: T1 },
      { ns: 'qstat', key: 'q2', json: null, updatedAt: T1 },
    ]);
  });

  it('keeps one change per (ns, key): the newest, a later entry winning ties', () => {
    const planned = planChanges(
      [
        asChange({ value: 'new', updatedAt: T2 }),
        asChange({ value: 'old', updatedAt: T1 }),
        asChange({ ns: 'cstat', value: 'first' }),
        asChange({ ns: 'cstat', value: 'second' }),
        asChange({ ns: 'history' }),
      ],
      NOW,
    );
    expect(planned.map((p) => [p.ns, p.json])).toEqual([
      ['qstat', '"new"'],
      ['cstat', '"second"'],
      ['history', '{"a":1}'],
    ]);
  });

  it('compares clamped clocks, so two future writes tie at now', () => {
    const far = new Date(NOW + 3_600_000).toISOString();
    const farther = new Date(NOW + 7_200_000).toISOString();
    const planned = planChanges([asChange({ value: 'a', updatedAt: farther }), asChange({ value: 'b', updatedAt: far })], NOW);
    expect(planned).toEqual([{ ns: 'qstat', key: 'q1', json: '"b"', updatedAt: new Date(NOW).toISOString() }]);
  });
});

describe('takePage', () => {
  const rows = [row('a', 1), row('b', 2), row('c', 3)];

  it('cuts at pageSize and reports more', () => {
    expect(takePage(rows, 2, 1_000_000)).toEqual({ rows: rows.slice(0, 2), more: true });
    expect(takePage(rows, 3, 1_000_000)).toEqual({ rows, more: false });
  });

  it('cuts at the byte budget but always returns at least one row', () => {
    const big = [row('a', 1, 'x'.repeat(500)), row('b', 2, 'y'.repeat(500))];
    expect(takePage(big, 10, 700)).toEqual({ rows: big.slice(0, 1), more: true });
    expect(takePage(big, 10, 0)).toEqual({ rows: big.slice(0, 1), more: true });
    expect(takePage([], 10, 0)).toEqual({ rows: [], more: false });
  });
});

describe('buildSyncResponse', () => {
  it('advances the cursor to the last page version and appends rejected-key rows once', () => {
    const page = { rows: [row('a', 7), row('b', 9)], more: true };
    const rejected = [row('b', 9), row('old', 3, { kept: true })];
    expect(buildSyncResponse(page, rejected, '5', 1)).toEqual({
      cursor: '9',
      more: true,
      accepted: 1,
      changes: [
        { ns: 'activity', key: 'a', value: { n: 7 }, updatedAt: T1, device: 'pc-1' },
        { ns: 'activity', key: 'b', value: { n: 9 }, updatedAt: T1, device: 'pc-1' },
        { ns: 'activity', key: 'old', value: { kept: true }, updatedAt: T1, device: 'pc-1' },
      ],
    });
  });

  it('keeps the request cursor when nothing is newer', () => {
    expect(buildSyncResponse({ rows: [], more: false }, [], '42', 0)).toEqual({
      cursor: '42',
      changes: [],
      more: false,
      accepted: 0,
    });
  });
});
