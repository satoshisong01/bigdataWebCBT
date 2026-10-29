import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_MESSAGES, SAVED_USERNAME_KEY, SYNC_EVENT, changePassword, clearSavedUsername, getAuthState, getSavedUsername,
  getSyncStatus, login, logout, setSavedUsername, startAutoSync, syncNow, verifyAuth,
} from './auth';
import { API_ROUTES } from './sync/protocol';
import { SYNC_STORAGE_KEYS as K } from './sync/adapters';
import { SYNC_META_KEY } from './sync/meta';
import { API_MESSAGES, GET_INIT } from './sync/transport';
import { FAKE_MESSAGES } from './sync/testing/fakeServer';
import { createDevice } from './sync/testing/device';
import { PASSWORD, seedFull } from './sync/testing/fixtures';
import { createWorld, loggedInDevice } from './sync/testing/world';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('login', () => {
  it('checks the input before calling the server', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    expect(await a.auth.login('   ', PASSWORD, true)).toEqual({ ok: false, error: AUTH_MESSAGES.missingCredentials });
    expect(await a.auth.login('alice', '', true)).toEqual({ ok: false, error: AUTH_MESSAGES.missingCredentials });
    expect(a.client.requests).toHaveLength(0);
  });

  it('trims the username, sends "remember", stores the account and syncs', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    seedFull(a);
    const res = await a.auth.login('  alice ', PASSWORD, false);
    expect(res).toMatchObject({ ok: true, username: 'alice', sync: { status: 'ok', sent: 14 } });
    expect(a.client.requests[0]).toMatchObject({
      url: API_ROUTES.login, method: 'POST', body: { username: 'alice', password: PASSWORD, remember: false },
    });
    expect(a.auth.getAuthState()).toEqual({ loggedIn: true, username: 'alice', userId: w.alice });
    expect(JSON.stringify(a.engine.readMeta())).not.toContain(PASSWORD);
  });

  it('passes the server’s Korean error through and stays logged out', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    expect(await a.auth.login('alice', 'wrong-password', true)).toEqual({ ok: false, error: FAKE_MESSAGES.loginFailed });
    expect(a.auth.getAuthState()).toEqual({ loggedIn: false });
    expect(a.client.syncBodies()).toHaveLength(0);
    w.server.failNext(API_ROUTES.login, 429, { ok: false, error: '잠시 후 다시 시도해 주세요' });
    expect(await a.auth.login('alice', PASSWORD, true)).toEqual({ ok: false, error: '잠시 후 다시 시도해 주세요' });
  });

  it('falls back to Korean messages when the server gives none', async () => {
    const w = createWorld();
    const a = createDevice(w.server, w.clock, 'A');
    w.server.failNext(API_ROUTES.login, 401);
    expect(await a.auth.login('alice', PASSWORD, true)).toEqual({ ok: false, error: AUTH_MESSAGES.loginFailed });
    w.server.failNext(API_ROUTES.login, 0);
    expect(await a.auth.login('alice', PASSWORD, true)).toEqual({ ok: false, error: API_MESSAGES.network });
    w.server.failNext(API_ROUTES.login, 500);
    expect(await a.auth.login('alice', PASSWORD, true)).toEqual({ ok: false, error: API_MESSAGES.server });
  });

  it('asks /api/auth/me when the login reply carries no account data', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    a.engine.endSession('expired'); // locally logged out, cookie still valid
    w.server.failNext(API_ROUTES.login, 200, { ok: true, data: {} });
    expect(await a.auth.login('alice', PASSWORD, true)).toMatchObject({ ok: true, username: 'alice' });
    expect(a.client.requests.map(r => r.url).slice(-3)).toEqual([API_ROUTES.login, API_ROUTES.me, API_ROUTES.sync]);

    a.engine.endSession('expired');
    w.server.failNext(API_ROUTES.login, 200, { ok: true, data: null });
    w.server.failNext(API_ROUTES.me, 503, { ok: false, error: '점검 중입니다' });
    expect(await a.auth.login('alice', PASSWORD, true)).toEqual({ ok: false, error: '점검 중입니다' });
    expect(a.auth.getAuthState().loggedIn).toBe(false);
  });
});

describe('logout', () => {
  it('uploads pending changes, ends the server session and keeps local study data', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    a.set(K.bookmark, ['q-77']);
    await a.auth.logout();
    expect(a.client.requests.map(r => r.url).slice(-2)).toEqual([API_ROUTES.sync, API_ROUTES.logout]);
    expect(w.server.record(w.alice, 'bookmark', 'q-77')?.value).toBe(true);
    expect(a.auth.getAuthState()).toEqual({ loggedIn: false });
    expect(a.engine.readMeta()).toMatchObject({ userId: w.alice, cursor: '0', synced: {}, dirty: {}, initialDone: false });
    expect(a.get(K.bookmark)).toEqual(['q-77']);
    expect((await a.client.fetch(API_ROUTES.me, GET_INIT)).status).toBe(401);
  });

  it('logs out locally even when the server cannot be reached', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    w.server.failNext(API_ROUTES.logout, 0);
    await a.auth.logout();
    expect(a.auth.getAuthState()).toEqual({ loggedIn: false });
  });
});

describe('verifyAuth', () => {
  it('confirms a live session and keeps the state when the server is unreachable', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    expect(await a.auth.verifyAuth()).toEqual({ loggedIn: true, username: 'alice', userId: w.alice });
    expect(a.client.requests.at(-1)).toMatchObject({ url: API_ROUTES.me, method: 'GET' });
    w.server.failNext(API_ROUTES.me, 0);
    expect(await a.auth.verifyAuth()).toMatchObject({ loggedIn: true });
  });

  it('logs out on 401 or when the cookie belongs to another account', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    w.server.failNext(API_ROUTES.me, 200, { ok: true, data: { userId: 999, username: 'mallory' } });
    expect(await a.auth.verifyAuth()).toEqual({ loggedIn: false });

    await a.auth.login('alice', PASSWORD, true);
    w.server.expireSessions();
    expect(await a.auth.verifyAuth()).toEqual({ loggedIn: false });
    expect(a.engine.readMeta().lastError).toBe(FAKE_MESSAGES.needLogin);
    const calls = a.client.requests.length;
    expect(await a.auth.verifyAuth()).toEqual({ loggedIn: false });
    expect(a.client.requests).toHaveLength(calls);
  });
});

describe('changePassword', () => {
  it('checks the input before calling the server', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    const calls = a.client.requests.length;
    expect(await a.auth.changePassword('', 'new-password')).toEqual({ ok: false, error: AUTH_MESSAGES.missingCurrent });
    expect(await a.auth.changePassword(PASSWORD, '12345')).toEqual({ ok: false, error: AUTH_MESSAGES.shortPassword });
    expect(a.client.requests).toHaveLength(calls);
  });

  it('changes the password; other sessions end', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    const b = await loggedInDevice(w, 'B', false);
    expect(await a.auth.changePassword(PASSWORD, 'brand-new-pw')).toEqual({ ok: true });
    expect(await a.engine.syncNow()).toMatchObject({ status: 'ok' });
    expect(await b.engine.syncNow()).toMatchObject({ status: 'unauthorized' });
    expect((await b.auth.login('alice', PASSWORD, true)).ok).toBe(false);
    expect((await b.auth.login('alice', 'brand-new-pw', true)).ok).toBe(true);
  });

  it('passes errors through and logs out only when the session is really gone', async () => {
    const w = createWorld();
    const a = await loggedInDevice(w, 'A', false);
    expect(await a.auth.changePassword('not-it', 'brand-new-pw')).toEqual({ ok: false, error: FAKE_MESSAGES.wrongPassword });
    w.server.failNext(API_ROUTES.password, 401, { ok: false, error: FAKE_MESSAGES.wrongPassword });
    expect(await a.auth.changePassword('not-it', 'brand-new-pw')).toEqual({ ok: false, error: FAKE_MESSAGES.wrongPassword });
    expect(a.auth.getAuthState().loggedIn).toBe(true); // /me still answered: only the password was wrong
    w.server.expireSessions();
    expect(await a.auth.changePassword(PASSWORD, 'brand-new-pw')).toEqual({ ok: false, error: FAKE_MESSAGES.needLogin });
    expect(a.auth.getAuthState().loggedIn).toBe(false);
  });
});

describe('saved username (아이디 저장)', () => {
  it('stores only the trimmed username and clears on empty input', () => {
    expect(getSavedUsername()).toBe('');
    setSavedUsername('  alice ');
    expect(getSavedUsername()).toBe('alice');
    expect(Object.keys(localStorage)).toEqual([SAVED_USERNAME_KEY]);
    setSavedUsername('   ');
    expect(getSavedUsername()).toBe('');
    setSavedUsername('bob');
    clearSavedUsername();
    expect(localStorage.getItem(SAVED_USERNAME_KEY)).toBeNull();
  });
});

describe('module-level API', () => {
  it('binds the exported functions to the shared browser engine', async () => {
    const w = createWorld();
    vi.stubGlobal('fetch', w.server.client().fetch);
    expect(getAuthState()).toEqual({ loggedIn: false });
    expect(await login('alice', PASSWORD, true)).toMatchObject({ ok: true, sync: { status: 'ok' } });
    expect(getAuthState()).toMatchObject({ loggedIn: true, username: 'alice' });
    expect(getSyncStatus()).toMatchObject({ loggedIn: true, username: 'alice', syncing: false, pending: 0 });
    expect(JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? '{}')).toMatchObject({ username: 'alice' });
    expect(await syncNow()).toMatchObject({ status: 'ok' });
    expect(await verifyAuth()).toMatchObject({ loggedIn: true });
    expect(await changePassword(PASSWORD, 'brand-new-pw')).toEqual({ ok: true });
    const stop = startAutoSync();
    stop();
    await logout();
    expect(getAuthState()).toEqual({ loggedIn: false });
    expect(SYNC_EVENT).toBe('bigdata-cbt-synced');
  });
});
