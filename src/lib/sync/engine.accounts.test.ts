import { describe, it, expect } from 'vitest';
import { SAVED_USERNAME_KEY } from '@/lib/auth';
import { SYNC_STORAGE_KEYS as K } from './adapters';
import { SYNC_META_KEY } from './meta';
import { FAKE_MESSAGES } from './testing/fakeServer';
import { createDevice } from './testing/device';
import { HISTORY_DATE, PASSWORD, SEED_SETTINGS, examRecord, qstat, seedFull } from './testing/fixtures';
import { createWorld, loggedInDevice } from './testing/world';

describe('accounts', () => {
  it('clears this device’s study data before syncing a different account', async () => {
    const w = createWorld();
    const bob = w.server.addUser('bob', 'bob-secret-1');
    const x = createDevice(w.server, w.clock, 'X');
    x.set(K.bookmark, ['b-1']);
    x.set(K.qstat, { 'b-q': qstat('2026-10-25T00:00:00.000Z') });
    await x.auth.login('bob', 'bob-secret-1', true);

    const d = await loggedInDevice(w, 'D');
    d.storage.setItem('bigdata-cbt-theme', 'dark');
    d.storage.setItem(SAVED_USERNAME_KEY, 'alice');
    await d.auth.logout();
    expect(d.auth.getAuthState()).toEqual({ loggedIn: false });
    expect(d.engine.readMeta()).toEqual({ device: 'device-D', userId: w.alice, cursor: '0', synced: {}, dirty: {}, initialDone: false });
    expect(d.get(K.bookmark)).toEqual(['q-1', 'q-9']); // logout keeps local study data

    const res = await d.auth.login('bob', 'bob-secret-1', false);
    expect(res.ok && res.sync).toMatchObject({ status: 'ok', sent: 0, applied: 2 });
    expect(d.get(K.qstat)).toEqual({ 'b-q': qstat('2026-10-25T00:00:00.000Z') });
    expect(d.get(K.bookmark)).toEqual(['b-1']);
    for (const key of [K.cstat, K.activity, K.mock, K.history, K.wrong, K.retry, K.answers, K.studyday, K.settings]) {
      expect(d.get(key)).toBeUndefined();
    }
    expect(d.storage.getItem('bigdata-cbt-theme')).toBe('dark');
    expect(d.storage.getItem(SAVED_USERNAME_KEY)).toBe('alice');
    expect(w.server.records(bob).map(r => `${r.ns}|${r.key}`).sort()).toEqual(['bookmark|b-1', 'qstat|b-q']);
    expect(w.server.records(w.alice)).toHaveLength(14);
    expect(d.engine.readMeta()).toMatchObject({ username: 'bob', userId: bob, initialDone: true });
  });

  it('uploads the old account’s pending changes before switching accounts without logging out', async () => {
    const w = createWorld();
    const bob = w.server.addUser('bob', 'bob-secret-1');
    const d = await loggedInDevice(w, 'D');
    d.set(K.bookmark, ['q-1', 'q-9', 'q-42']);
    const res = await d.auth.login('bob', 'bob-secret-1', true);
    expect(res.ok).toBe(true);
    expect(w.server.record(w.alice, 'bookmark', 'q-42')?.value).toBe(true);
    expect(w.server.records(bob)).toEqual([]);
    expect(d.get(K.bookmark)).toBeUndefined();
  });

  it('merges by the 1970 rule when the same account logs back in after logout', async () => {
    const w = createWorld();
    const d = await loggedInDevice(w, 'D');
    await d.auth.logout();
    w.clock.set('2026-10-29T15:00:00.000Z');
    d.set(K.settings, { ...SEED_SETTINGS, dailyQuestionGoal: 99 }); // unstamped edit while logged out
    d.set(K.qstat, { ...(d.get(K.qstat) as object), 'q-7': qstat('2026-10-29T15:00:00.000Z') });
    const res = await d.auth.login('alice', PASSWORD, true);
    expect(res.ok && res.sync).toMatchObject({ status: 'ok', applied: 1 });
    expect(d.get(K.settings)).toEqual(SEED_SETTINGS);
    expect(w.server.record(w.alice, 'qstat', 'q-7')?.updatedAt).toBe('2026-10-29T15:00:00.000Z');
    expect(d.get(K.history)).toEqual([examRecord('session-6', HISTORY_DATE)]);
  });

  it('marks the device logged out on 401 but keeps its sync progress for the next login', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    w.server.expireSessions();
    expect(await a.engine.syncNow()).toEqual({ status: 'unauthorized', error: FAKE_MESSAGES.needLogin });
    expect(a.auth.getAuthState()).toEqual({ loggedIn: false });
    const meta = a.engine.readMeta();
    expect(meta).toMatchObject({ userId: w.alice, cursor: '14', initialDone: true, lastError: FAKE_MESSAGES.needLogin });
    expect(meta.username).toBeUndefined();
    expect(Object.keys(meta.synced)).toHaveLength(14);

    const calls = a.client.requests.length;
    expect(await a.engine.syncNow()).toEqual({ status: 'skipped', reason: 'logged-out' });
    expect(a.client.requests).toHaveLength(calls);
    await a.auth.login('alice', PASSWORD, true);
    expect(a.client.syncBodies().at(-1)?.cursor).toBe('14');
    expect(a.engine.readMeta().lastError).toBeUndefined();
  });
});

describe('skips', () => {
  it('does nothing while offline', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w);
    a.setOnline(false);
    const calls = a.client.requests.length;
    expect(await a.engine.syncNow()).toEqual({ status: 'skipped', reason: 'offline' });
    expect(a.client.requests).toHaveLength(calls);
  });

  it('does nothing before login', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    seedFull(a);
    expect(await a.engine.syncNow()).toEqual({ status: 'skipped', reason: 'logged-out' });
    expect(a.engine.hasPendingChanges()).toBe(false);
    expect(a.client.requests).toHaveLength(0);
    expect(JSON.parse(a.storage.getItem(SYNC_META_KEY) ?? '{}')).toMatchObject({ device: 'device-A', cursor: '0' });
  });
});
