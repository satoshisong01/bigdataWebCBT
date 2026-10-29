import { describe, it, expect } from 'vitest';
import { SYNC_STORAGE_KEYS as K } from './adapters';
import { EPOCH_ISO } from './meta';
import { createDevice, type TestDevice } from './testing/device';
import {
  FULL_KEYS, HISTORY_DATE, MOCK_DATE, PASSWORD, SEED_SETTINGS, SEED_STREAK, T0,
  activity, examRecord, qstat, seedFull,
} from './testing/fixtures';
import { createWorld, loggedInDevice, type World } from './testing/world';

/** A (seeded) and B (empty before its login), both logged in and in sync. */
async function pair(w: World): Promise<[TestDevice, TestDevice]> {
  return [await loggedInDevice(w), await loggedInDevice(w, 'B', false)];
}

describe('first login', () => {
  it('uploads every local record (stamps where records have them, 1970 otherwise)', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    seedFull(a);
    const res = await a.auth.login('alice', PASSWORD, true);
    expect(res).toEqual({ ok: true, username: 'alice', sync: { status: 'ok', applied: 0, sent: 14, rounds: 1 } });

    const records = new Map(w.server.records(w.alice).map(r => [`${r.ns}|${r.key}`, r]));
    expect([...records.keys()].sort()).toEqual(FULL_KEYS);
    expect(records.get('qstat|q-1')).toMatchObject({
      value: qstat('2026-10-20T09:00:00.000Z'), updatedAt: '2026-10-20T09:00:00.000Z', device: 'device-A',
    });
    expect(records.get('cstat|c-1')?.updatedAt).toBe('2026-10-20T10:00:00.000Z');
    expect(records.get(`mock|mock-1|${MOCK_DATE}`)?.updatedAt).toBe(MOCK_DATE);
    expect(records.get('history|session-6')).toMatchObject({ value: examRecord('session-6', HISTORY_DATE), updatedAt: HISTORY_DATE });
    expect(records.get('wrong|session-6')).toMatchObject({ value: ['6-3', '6-7'], updatedAt: HISTORY_DATE });
    expect(records.get('answers|session-6')?.updatedAt).toBe(HISTORY_DATE);
    for (const key of ['activity|2026-10-20', 'retry|session-6', 'bookmark|q-9', 'studyday|2026-10-19', 'settings|settings']) {
      expect(records.get(key)?.updatedAt).toBe(EPOCH_ISO);
    }
    expect(records.get('bookmark|q-9')?.value).toBe(true);
    expect(records.get('studyday|2026-10-20')?.value).toBe(true);
    expect(records.get('settings|settings')?.value).toEqual(SEED_SETTINGS);

    const meta = a.engine.readMeta();
    expect(meta).toMatchObject({ username: 'alice', userId: w.alice, device: 'device-A', cursor: '14', dirty: {}, initialDone: true, lastSyncAt: T0 });
    expect(Object.keys(meta.synced).sort()).toEqual(FULL_KEYS);
    expect(a.syncEvents).toEqual([]); // nothing came from another device
  });

  it('sends nothing on a second sync without changes', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    expect(await a.engine.syncNow()).toEqual({ status: 'ok', applied: 0, sent: 0, rounds: 1 });
    expect(a.client.syncBodies().at(-1)).toEqual({ device: 'device-A', cursor: '14', changes: [] });
    expect(a.engine.hasPendingChanges()).toBe(false);
  });

  it("merges a second device without overwriting newer server data; stamped records follow their stamps", async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    w.clock.set('2026-10-29T10:00:00.000Z');
    a.set(K.settings, { planStart: '2026-10-01', dailyQuestionGoal: 60 });
    await a.engine.syncNow();

    const b = createDevice(w.server, w.clock, 'B');
    b.set(K.settings, { planStart: '2026-10-28', dailyQuestionGoal: 10 }); // unstamped → 1970 → loses
    b.set(K.qstat, {
      'q-1': qstat('2026-10-19T08:00:00.000Z', 5, 2), // older than A's → server copy wins
      'q-2': qstat('2026-10-22T08:00:00.000Z', 3, 3), // newer than A's → B's wins
      'q-3': qstat('2026-10-28T08:00:00.000Z'), // only on B
    });
    b.set(K.activity, { '2026-10-20': activity(3, 1), '2026-10-28': activity(8, 6, 2, 4) });
    b.set(K.bookmark, ['q-5']);
    b.set(K.studyday, { days: ['2026-10-28'], current: 1, best: 1 });
    w.clock.set('2026-10-29T11:00:00.000Z');
    const res = await b.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toEqual({ status: 'ok', applied: 13, sent: 8, rounds: 1 });

    expect(b.get(K.settings)).toEqual({ planStart: '2026-10-01', dailyQuestionGoal: 60 });
    expect(b.get(K.qstat)).toEqual({
      'q-1': qstat('2026-10-20T09:00:00.000Z'),
      'q-2': qstat('2026-10-22T08:00:00.000Z', 3, 3),
      'q-3': qstat('2026-10-28T08:00:00.000Z'),
    });
    expect(b.get(K.activity)).toEqual({ '2026-10-20': activity(10, 7, 5), '2026-10-28': activity(8, 6, 2, 4) });
    expect(b.get(K.bookmark)).toEqual(['q-5', 'q-1', 'q-9']);
    expect(b.get(K.studyday)).toEqual({ days: ['2026-10-19', '2026-10-20', '2026-10-28'], current: 1, best: 2 });
    for (const key of [K.cstat, K.mock, K.history, K.wrong, K.retry, K.answers]) expect(b.get(key)).toEqual(a.get(key));
    expect(b.syncEvents).toEqual([13]);
    expect(w.server.record(w.alice, 'qstat', 'q-2')).toMatchObject({ updatedAt: '2026-10-22T08:00:00.000Z', device: 'device-B' });
    expect(w.server.record(w.alice, 'activity', '2026-10-20')).toMatchObject({ value: activity(10, 7, 5), device: 'device-A' });

    w.clock.set('2026-10-29T11:30:00.000Z');
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', applied: 5 });
    expect(a.get(K.qstat)).toEqual(b.get(K.qstat));
    expect(a.get(K.activity)).toEqual(b.get(K.activity));
    expect(a.get(K.bookmark)).toEqual(['q-1', 'q-9', 'q-5']);
    expect(a.get(K.studyday)).toEqual({ days: ['2026-10-19', '2026-10-20', '2026-10-28'], current: 1, best: 2 });
    expect(a.get(K.settings)).toEqual({ planStart: '2026-10-01', dailyQuestionGoal: 60 });
    expect(a.syncEvents).toEqual([5]);
  });

  it('keeps the order of array records (bookmarks, history) on the receiving device', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    a.set(K.bookmark, ['q-9', 'q-1', 'q-5']);
    a.set(K.history, [examRecord('session-9', T0), examRecord('session-1', HISTORY_DATE)]);
    await a.auth.login('alice', PASSWORD, true);
    const b = createDevice(w.server, w.clock, 'B');
    await b.auth.login('alice', PASSWORD, true);
    expect(b.get(K.bookmark)).toEqual(['q-9', 'q-1', 'q-5']);
    expect(b.get(K.history)).toEqual(a.get(K.history));
  });

  it('pages through more than one response page', async () => {
    const w = createWorld(5);
    const a = createDevice(w.server, w.clock, 'A');
    const many = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`q-${i + 10}`, qstat(`2026-10-${i + 10}T09:00:00.000Z`)]),
    );
    a.set(K.qstat, many);
    const up = await a.auth.login('alice', PASSWORD, true);
    expect(up.ok && up.sync).toEqual({ status: 'ok', applied: 0, sent: 12, rounds: 3 });
    expect(a.client.syncBodies().map(body => [body.cursor, body.changes.length])).toEqual([['0', 12], ['5', 0], ['10', 0]]);

    const b = createDevice(w.server, w.clock, 'B');
    const down = await b.auth.login('alice', PASSWORD, true);
    expect(down.ok && down.sync).toEqual({ status: 'ok', applied: 12, sent: 0, rounds: 3 });
    expect(b.get(K.qstat)).toEqual(many);
    expect(b.syncEvents).toEqual([12]);
    expect(b.engine.readMeta()).toMatchObject({ cursor: '12', initialDone: true });
  });
});

describe('after the first sync', () => {
  it('resolves concurrent edits by updatedAt — the rejected older change gets the newer value echoed', async () => {
    const w = createWorld();
    const [a, b] = await pair(w);
    w.clock.set('2026-10-29T12:00:00.000Z');
    a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 70 });
    expect(a.engine.hasPendingChanges()).toBe(true); // first seen at 12:00
    w.clock.set('2026-10-29T12:05:00.000Z');
    b.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 80 });
    expect(b.engine.hasPendingChanges()).toBe(true);

    w.clock.set('2026-10-29T12:10:00.000Z');
    expect(await b.engine.syncNow()).toMatchObject({ status: 'ok', sent: 1, applied: 0 });
    w.clock.set('2026-10-29T12:11:00.000Z'); // A uploads later, but its edit is older
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 1, applied: 1 });
    expect(a.client.syncBodies().at(-1)?.changes).toEqual([
      { ns: 'settings', key: 'settings', value: { ...SEED_SETTINGS, dailyQuestionGoal: 70 }, updatedAt: '2026-10-29T12:00:00.000Z' },
    ]);
    expect(a.get(K.settings)).toEqual({ ...SEED_SETTINGS, dailyQuestionGoal: 80 });
    expect(a.engine.readMeta().dirty).toEqual({});
    expect(w.server.record(w.alice, 'settings', 'settings')).toMatchObject({ updatedAt: '2026-10-29T12:05:00.000Z', device: 'device-B' });
  });

  it('lets the later edit win when the earlier one is uploaded first', async () => {
    const w = createWorld();
    const [a, b] = await pair(w);
    const retry = (base: number) => ({ 'session-6': { totals: { 1: 20 }, baseCorrect: { 1: base } } });
    w.clock.set('2026-10-29T13:00:00.000Z');
    a.set(K.retry, retry(15));
    a.engine.hasPendingChanges();
    w.clock.set('2026-10-29T13:05:00.000Z');
    b.set(K.retry, retry(18));
    b.engine.hasPendingChanges();

    w.clock.set('2026-10-29T13:10:00.000Z');
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(await a.engine.syncNow()).toMatchObject({ applied: 1 });
    expect(a.get(K.retry)).toEqual(retry(18));
    expect(b.get(K.retry)).toEqual(retry(18));
    expect(w.server.record(w.alice, 'retry', 'session-6')?.updatedAt).toBe('2026-10-29T13:05:00.000Z');
  });

  it('propagates bookmark removal, history deletion and cleared answers as tombstones', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    seedFull(a);
    a.set(K.history, [examRecord('session-6', HISTORY_DATE), examRecord('session-7', '2026-10-21T12:00:00.000Z')]);
    await a.auth.login('alice', PASSWORD, true);
    const b = createDevice(w.server, w.clock, 'B');
    await b.auth.login('alice', PASSWORD, true);
    expect(b.get(K.history)).toHaveLength(2);

    w.clock.set('2026-10-29T14:00:00.000Z');
    a.set(K.bookmark, ['q-9']);
    a.set(K.history, [examRecord('session-6', HISTORY_DATE)]);
    a.set(K.answers, {});
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 3 });
    const sent = [...(a.client.syncBodies().at(-1)?.changes ?? [])].sort((x, y) => x.ns.localeCompare(y.ns));
    expect(sent).toEqual([
      { ns: 'answers', key: 'session-6', value: null, updatedAt: '2026-10-29T14:00:00.000Z' },
      { ns: 'bookmark', key: 'q-1', value: null, updatedAt: '2026-10-29T14:00:00.000Z' },
      { ns: 'history', key: 'session-7', value: null, updatedAt: '2026-10-29T14:00:00.000Z' },
    ]);
    expect(w.server.record(w.alice, 'bookmark', 'q-1')?.value).toBeNull();

    w.clock.set('2026-10-29T14:05:00.000Z');
    expect(await b.engine.syncNow()).toMatchObject({ status: 'ok', applied: 3 });
    expect(b.get(K.bookmark)).toEqual(['q-9']);
    expect(b.get(K.history)).toEqual([examRecord('session-6', HISTORY_DATE)]);
    expect(b.get(K.answers)).toEqual({});
    for (const device of [a, b]) {
      expect(Object.keys(device.engine.readMeta().synced)).not.toContain('bookmark|q-1');
      expect(device.engine.hasPendingChanges()).toBe(false);
    }
  });

  it('unions study days and recomputes current/best like storage.ts', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    a.set(K.studyday, { days: ['2026-10-26', '2026-10-27'], current: 2, best: 5 });
    await a.auth.login('alice', PASSWORD, true);
    const b = createDevice(w.server, w.clock, 'B');
    b.set(K.studyday, { days: ['2026-10-28', '2026-10-29'], current: 2, best: 2 });
    await b.auth.login('alice', PASSWORD, true);
    await a.engine.syncNow();

    const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'];
    expect(a.get(K.studyday)).toEqual({ days, current: 4, best: 5 }); // best never shrinks
    expect(b.get(K.studyday)).toEqual({ days, current: 4, best: 4 });
  });

  it('keeps a newer local edit made during a request and uploads it next round', async () => {
    const w = createWorld();
    const [a, b] = await pair(w);
    w.clock.set('2026-10-29T16:00:00.000Z');
    b.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 30 });
    await b.engine.syncNow();

    w.clock.set('2026-10-29T16:10:00.000Z');
    w.server.beforeNextSync(() => a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 99 }));
    expect(await a.engine.syncNow()).toEqual({ status: 'ok', applied: 0, sent: 1, rounds: 2 });
    expect(a.get(K.settings)).toEqual({ ...SEED_SETTINGS, dailyQuestionGoal: 99 }); // B's older value was not applied
    expect(w.server.record(w.alice, 'settings', 'settings')).toMatchObject({ updatedAt: '2026-10-29T16:10:00.000Z', device: 'device-A' });
    await b.engine.syncNow();
    expect(b.get(K.settings)).toEqual({ ...SEED_SETTINGS, dailyQuestionGoal: 99 });
  });

  it('re-sends a record edited again while its upload was in flight', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    w.clock.set('2026-10-29T15:00:00.000Z');
    a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 41 });
    w.server.beforeNextSync(() => {
      w.clock.advance(1000);
      a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 42 });
    });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 2, rounds: 2 });
    expect(w.server.record(w.alice, 'settings', 'settings')).toMatchObject({
      value: { ...SEED_SETTINGS, dailyQuestionGoal: 42 }, updatedAt: '2026-10-29T15:00:01.000Z',
    });
    expect(a.engine.readMeta().dirty).toEqual({});
  });

  it('re-sends edits made during a request whose echo lands on a later page', async () => {
    const w = createWorld(1);
    const a = await loggedInDevice(w);
    w.clock.set('2026-10-29T15:00:00.000Z');
    a.set(K.qstat, { ...(a.get(K.qstat) as object), 'q-1': qstat('2026-10-29T15:00:00.000Z', 2, 2) });
    a.set(K.bookmark, ['q-9']); // tombstone for q-1
    a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 61 });
    w.server.beforeNextSync(() => {
      w.clock.advance(1000);
      a.set(K.bookmark, ['q-9', 'q-1']); // re-added while the tombstone is in flight
      a.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 62 });
    });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', sent: 5 });
    expect(w.server.record(w.alice, 'bookmark', 'q-1')).toMatchObject({ value: true, updatedAt: '2026-10-29T15:00:01.000Z' });
    expect(w.server.record(w.alice, 'settings', 'settings')?.value).toEqual({ ...SEED_SETTINGS, dailyQuestionGoal: 62 });
    expect(a.engine.hasPendingChanges()).toBe(false);
  });

  it('leaves remote values it cannot store alone — no local write, no tombstone, no overwrite', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    const raw = w.server.client();
    const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await raw.fetch('/api/auth/login', post({ username: 'alice', password: PASSWORD, remember: true }));
    const future = '2026-10-29T17:00:00.000Z';
    await raw.fetch('/api/sync', post({
      device: 'newer-app', cursor: '0', changes: [
        { ns: 'wrong', key: 'session-6', value: { ids: ['6-3'], v: 2 }, updatedAt: future },
        { ns: 'qstat', key: 'q-new', value: 'packed-v2', updatedAt: future },
      ],
    }));
    w.clock.set('2026-10-29T17:05:00.000Z');
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok', applied: 0, sent: 0 });
    expect(a.get(K.wrong)).toEqual({ 'session-6': ['6-3', '6-7'] });
    expect(a.get(K.qstat)).not.toHaveProperty('q-new');
    expect(await a.engine.syncNow()).toMatchObject({ sent: 0 });
    expect(w.server.record(w.alice, 'wrong', 'session-6')?.value).toEqual({ ids: ['6-3'], v: 2 });
    expect(w.server.record(w.alice, 'qstat', 'q-new')?.value).toBe('packed-v2');
  });

  it('never lets a remote tombstone remove a study day (add-only namespaces re-offer the record)', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    const raw = w.server.client();
    const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await raw.fetch('/api/auth/login', post({ username: 'alice', password: PASSWORD, remember: true }));
    w.clock.set('2026-10-29T16:00:00.000Z');
    await raw.fetch('/api/sync', post({
      device: 'other', cursor: '0', changes: [{ ns: 'studyday', key: '2026-10-20', value: null, updatedAt: '2026-10-29T16:00:00.000Z' }],
    }));
    expect(w.server.record(w.alice, 'studyday', '2026-10-20')?.value).toBeNull();

    w.clock.set('2026-10-29T16:05:00.000Z');
    await a.engine.syncNow();
    expect(a.get(K.studyday)).toEqual(SEED_STREAK);
    await a.engine.syncNow();
    expect(w.server.record(w.alice, 'studyday', '2026-10-20')).toMatchObject({ value: true, updatedAt: '2026-10-29T16:05:00.000Z' });
  });
});
