/**
 * Browser-side account client (docs §7.2, §7.5). The session token is an HttpOnly cookie the page
 * never sees: "logged in" means the sync meta holds a username, confirmed by GET /api/auth/me.
 * Korean error strings from the API are passed through unchanged.
 */
import { API_ROUTES, type ChangePasswordRequest, type LoginRequest, type MeData } from './sync/protocol';
import { getSyncEngine, type SyncEngine, type SyncResult } from './sync/engine';
import { browserStorage } from './sync/store';
import { GET_INIT, ignoreData, postJson, type ApiOutcome } from './sync/transport';
import { parseMe } from './sync/wire';

export { SYNC_EVENT, SYNC_STATUS_EVENT, getSyncStatus, startAutoSync, syncNow } from './sync/engine';
export type { SyncEventDetail, SyncResult, SyncStatus } from './sync/engine';

/** '아이디 저장' — the username only; passwords are never stored by the app. */
export const SAVED_USERNAME_KEY = 'bigdata-cbt-saved-username';
/** Server minimum (8+ recommended). */
export const MIN_PASSWORD_LENGTH = 6;

export interface AuthState {
  loggedIn: boolean;
  username?: string;
  userId?: number;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export type LoginResult =
  | { ok: true; username: string; /** the sync that ran right after login */ sync: SyncResult }
  | {
      ok: false;
      error: string;
      /** set when logging into ANOTHER account would wipe this many un-uploaded changes of the last one */
      unsynced?: number;
    };

export interface LoginOptions {
  /** confirmed by the user: switch accounts even though the last account's changes never uploaded */
  discardUnsynced?: boolean;
}

export interface LogoutOptions {
  /** confirmed by the user: log out even though changes are still waiting for upload */
  force?: boolean;
}

/** Not logged out: the upload before logout did not get through and `unsynced` changes would be lost. */
export type LogoutResult = { ok: true } | { ok: false; unsynced: number };

export interface AuthClient {
  getAuthState(): AuthState;
  /** GET /api/auth/me: 401 (or another account's cookie) → logged out; network errors keep the state */
  verifyAuth(): Promise<AuthState>;
  login(username: string, password: string, remember: boolean, options?: LoginOptions): Promise<LoginResult>;
  /** Uploads pending changes if possible, ends the session; local study data stays on the device. */
  logout(options?: LogoutOptions): Promise<LogoutResult>;
  changePassword(current: string, next: string): Promise<AuthResult>;
}

export const AUTH_MESSAGES = {
  missingCredentials: '아이디와 비밀번호를 입력해 주세요.',
  loginFailed: '아이디 또는 비밀번호가 올바르지 않습니다.',
  missingCurrent: '현재 비밀번호를 입력해 주세요.',
  shortPassword: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
  unsyncedSwitch: (n: number): string =>
    `이 기기에 이전 계정의 아직 동기화되지 않은 변경 ${n}건이 있어요. 다른 계정으로 로그인하면 이 기기의 학습 기록이 지워져 그 변경은 사라져요.`,
} as const;

function failure(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Login data may or may not carry MeData; null means "ask GET /api/auth/me". */
function parseLoginData(data: unknown): MeData | null {
  return parseMe(data) ?? null;
}

export function createAuthClient(engine: SyncEngine): AuthClient {
  const getAuthState = (): AuthState => {
    const meta = engine.readMeta();
    return meta.username === undefined
      ? { loggedIn: false }
      : { loggedIn: true, username: meta.username, userId: meta.userId };
  };

  const verifyAuth = async (): Promise<AuthState> => {
    const state = getAuthState();
    if (!state.loggedIn) return state;
    const me = await engine.request(API_ROUTES.me, GET_INIT, parseMe);
    if (me.kind === 'error') return state;
    if (me.kind === 'unauthorized' || me.data.userId !== state.userId) {
      engine.endSession('expired', me.kind === 'unauthorized' ? me.error : undefined);
      return getAuthState();
    }
    return state;
  };

  const resolveMe = (fromLogin: MeData | null): Promise<ApiOutcome<MeData>> =>
    fromLogin ? Promise.resolve({ kind: 'ok', data: fromLogin }) : engine.request(API_ROUTES.me, GET_INIT, parseMe);

  /** A different account wipes this device's study data: never silently while changes of the last one are unsent. */
  const blockedSwitch = async (me: MeData, options: LoginOptions): Promise<LoginResult | null> => {
    const previous = engine.readMeta().userId;
    if (options.discardUnsynced || previous === undefined || previous === me.userId) return null;
    const unsynced = engine.unsyncedCount();
    if (unsynced === 0) return null;
    await engine.request(API_ROUTES.logout, postJson({}), ignoreData); // drop the new session again
    return { ok: false, error: AUTH_MESSAGES.unsyncedSwitch(unsynced), unsynced };
  };

  const login = async (
    username: string, password: string, remember: boolean, options: LoginOptions = {},
  ): Promise<LoginResult> => {
    const name = username.trim();
    if (name === '' || password === '') return failure(AUTH_MESSAGES.missingCredentials);
    // still logged in: upload the current account's last changes before its cookie is replaced
    if (getAuthState().loggedIn && engine.hasPendingChanges()) await engine.syncNow();
    const body: LoginRequest = { username: name, password, remember };
    const res = await engine.request(API_ROUTES.login, postJson(body), parseLoginData, AUTH_MESSAGES.loginFailed);
    if (res.kind !== 'ok') return failure(res.error);
    const me = await resolveMe(res.data);
    if (me.kind !== 'ok') return failure(me.error);
    const blocked = await blockedSwitch(me.data, options);
    if (blocked) return blocked;
    engine.beginSession(me.data);
    const sync = await engine.syncNow();
    return { ok: true, username: me.data.username, sync };
  };

  const logout = async (options: LogoutOptions = {}): Promise<LogoutResult> => {
    if (getAuthState().loggedIn && engine.hasPendingChanges()) await engine.syncNow();
    // logout resets the sync progress (docs §7.5): unsent edits and deletions would be forgotten
    const unsynced = getAuthState().loggedIn ? engine.unsyncedCount() : 0;
    if (unsynced > 0 && !options.force) return { ok: false, unsynced };
    engine.endSession('logout');
    await engine.request(API_ROUTES.logout, postJson({}), ignoreData);
    return { ok: true };
  };

  const changePassword = async (current: string, next: string): Promise<AuthResult> => {
    if (current === '') return failure(AUTH_MESSAGES.missingCurrent);
    if (next.length < MIN_PASSWORD_LENGTH) return failure(AUTH_MESSAGES.shortPassword);
    const body: ChangePasswordRequest = { current, next };
    const res = await engine.request(API_ROUTES.password, postJson(body), ignoreData);
    if (res.kind === 'ok') return { ok: true };
    if (res.kind === 'unauthorized') await verifyAuth(); // expired session → logged out; wrong password → still in
    return failure(res.error);
  };

  return { getAuthState, verifyAuth, login, logout, changePassword };
}

// ---------- shared app instance ----------

let shared: AuthClient | undefined;

function client(): AuthClient {
  shared ??= createAuthClient(getSyncEngine());
  return shared;
}

export function getAuthState(): AuthState {
  return client().getAuthState();
}

export function verifyAuth(): Promise<AuthState> {
  return client().verifyAuth();
}

export function login(
  username: string, password: string, remember: boolean, options?: LoginOptions,
): Promise<LoginResult> {
  return client().login(username, password, remember, options);
}

export function logout(options?: LogoutOptions): Promise<LogoutResult> {
  return client().logout(options);
}

export function changePassword(current: string, next: string): Promise<AuthResult> {
  return client().changePassword(current, next);
}

// ---------- '아이디 저장' ----------

export function getSavedUsername(): string {
  try {
    return browserStorage()?.getItem(SAVED_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Saves the (trimmed) username; an empty one clears it. */
export function setSavedUsername(username: string): void {
  const name = username.trim();
  try {
    if (name === '') browserStorage()?.removeItem(SAVED_USERNAME_KEY);
    else browserStorage()?.setItem(SAVED_USERNAME_KEY, name);
  } catch { /* storage disabled: the checkbox simply has no effect */ }
}

export function clearSavedUsername(): void {
  setSavedUsername('');
}
