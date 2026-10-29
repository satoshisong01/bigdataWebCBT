/**
 * Review fixes: un-uploaded work is never dropped silently (logout, account switch) and an
 * interrupted first sync does not clock post-login edits/deletions at 1970 (meta.baseline).
 */
import { describe, expect, it } from 'vitest';
import { API_ROUTES } from './protocol';
import { SYNC_STORAGE_KEYS as K, createAdapters } from './adapters';
import { EPOCH_ISO, readMeta } from './meta';
import { scan } from './scan';
import { createDevice } from './testing/device';
import { PASSWORD, T0 } from './testing/fixtures';
import { createMemoryStorage } from './testing/memoryStorage';
import { createWorld, loggedInDevice } from './testing/world';

const MINUTE = 60_000;

describe('logout with changes that could not be uploaded', () => {
  it('refuses until forced, then forgets them as docs §7.5 says', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    a.set(K.bookmark, ['q-1']);
    a.setOnline(false);
    expect(await a.auth.logout()).toEqual({ ok: false, unsynced: 1 });
    expect(a.auth.getAuthState()).toMatchObject({ loggedIn: true });
    expect(await a.auth.logout({ force: true })).toEqual({ ok: true });
    expect(a.auth.getAuthState()).toEqual({ loggedIn: false });
    expect(a.get(K.bookmark)).toEqual(['q-1']);
  });

  it('logs out at once when everything reached the server', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    a.set(K.bookmark, ['q-1']);
    expect(await a.auth.logout()).toEqual({ ok: true });
    expect(w.server.record(w.alice, 'bookmark', 'q-1')?.value).toBe(true);
  });
});

describe('switching accounts after the old session expired', () => {
  it('does not wipe un-uploaded work of the old account without confirmation', async () => {
    const w = createWorld();
    const bob = w.server.addUser('bob', PASSWORD);
    const a = await loggedInDevice(w, 'A', false);
    w.server.expireSessions();
    expect(await a.auth.verifyAuth()).toEqual({ loggedIn: false });
    a.set(K.bookmark, ['q-offline']);

    const blocked = await a.auth.login('bob', PASSWORD, true);
    expect(blocked).toMatchObject({ ok: false, unsynced: 1 });
    expect(a.get(K.bookmark)).toEqual(['q-offline']);
    expect(a.engine.readMeta().userId).toBe(w.alice);
    expect(a.client.requests.at(-1)?.url).toBe(API_ROUTES.logout);

    const confirmed = await a.auth.login('bob', PASSWORD, true, { discardUnsynced: true });
    expect(confirmed).toMatchObject({ ok: true, username: 'bob' });
    expect(a.get(K.bookmark)).toBeUndefined();
    expect(a.engine.readMeta().userId).toBe(bob);
  });

  it('switches without asking after a normal logout (sync progress already reset)', async () => {
    const w = createWorld();
    w.server.addUser('bob', PASSWORD);
    const a = await loggedInDevice(w, 'A', false);
    expect(await a.auth.logout()).toEqual({ ok: true });
    a.set(K.bookmark, ['q-later']);
    expect(await a.auth.login('bob', PASSWORD, true)).toMatchObject({ ok: true });
  });
});

describe('interrupted first sync (baseline clock)', () => {
  async function interruptedLogin() {
    const w = createWorld();
    const b = await loggedInDevice(w, 'B', false);
    b.set(K.settings, { planStart: '2026-10-01' });
    await b.engine.syncNow();
    w.clock.advance(MINUTE);
    const a = createDevice(w.server, w.clock, 'A');
    a.set(K.settings, { planStart: '2026-09-01' }); // existed before login
    w.server.failNext(API_ROUTES.sync, 0);
    expect(await a.auth.login('alice', PASSWORD, true)).toMatchObject({ ok: true, sync: { status: 'error' } });
    expect(a.engine.readMeta()).toMatchObject({ initialDone: false });
    expect(a.engine.readMeta().baseline).toHaveProperty(['settings|settings']);
    w.clock.advance(MINUTE);
    return { w, a };
  }

  it('a pre-login record still only fills gaps (server copy wins)', async () => {
    const { a } = await interruptedLogin();
    await a.engine.syncNow();
    expect(a.get(K.settings)).toMatchObject({ planStart: '2026-10-01' });
    expect(a.engine.readMeta()).toMatchObject({ initialDone: true, baseline: undefined });
  });

  it('an edit made after login is a real change and wins', async () => {
    const { w, a } = await interruptedLogin();
    a.set(K.settings, { planStart: '2026-11-01' });
    await a.engine.syncNow();
    expect(a.get(K.settings)).toMatchObject({ planStart: '2026-11-01' });
    expect(w.server.record(w.alice, 'settings', 'settings')?.value).toMatchObject({ planStart: '2026-11-01' });
  });

  it('a deletion of a settled record gets a real clock, not 1970', () => {
    const storage = createMemoryStorage();
    const adapters = createAdapters(() => storage);
    const meta = { ...readMeta(() => storage, () => 'dev'), synced: { 'bookmark|q-1': 'h' }, baseline: {} };
    const { meta: next } = scan({ adapters, meta, seen: new Map(), now: T0 });
    expect(next.dirty['bookmark|q-1']).toBe(T0);
    const legacy = scan({ adapters, meta: { ...meta, baseline: undefined }, seen: new Map(), now: T0 });
    expect(legacy.meta.dirty['bookmark|q-1']).toBe(EPOCH_ISO);
  });
});
