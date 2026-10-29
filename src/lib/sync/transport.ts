/** JSON calls to the auth/sync Route Handlers: `{ ok, data | error }` envelopes, timeouts, Korean fallbacks. */
import { isRecord } from './store';

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

/** window.fetch's call shape (injectable for tests). */
export type FetchFn = (url: string, init: RequestInit) => Promise<HttpResponse>;

export type ApiOutcome<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'unauthorized'; error: string }
  /** status 0 = no response (offline, timeout) */
  | { kind: 'error'; error: string; status: number };

export const API_MESSAGES = {
  network: '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  request: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  badResponse: '서버 응답을 이해하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  unauthorized: '로그인이 필요합니다. 다시 로그인해 주세요.',
} as const;

export function postJson(body: unknown, keepalive = false): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
    ...(keepalive ? { keepalive: true } : {}),
  };
}

export const GET_INIT: Readonly<RequestInit> = { method: 'GET', credentials: 'same-origin', cache: 'no-store' };

/** For endpoints whose `data` carries nothing the client needs. */
export function ignoreData(): null {
  return null;
}

/** The server's own (Korean) message from an `{ ok: false, error }` body. */
function serverError(body: unknown): string | undefined {
  return isRecord(body) && body.ok === false && typeof body.error === 'string' && body.error !== ''
    ? body.error
    : undefined;
}

/**
 * Never throws. `parse` validates `data` (undefined = malformed). Server error strings are passed
 * through; `unauthorizedMessage` replaces the default text for a 401 without one.
 */
export async function callApi<T>(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parse: (data: unknown) => T | undefined,
  unauthorizedMessage: string = API_MESSAGES.unauthorized,
): Promise<ApiOutcome<T>> {
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetchFn(url, controller ? { ...init, signal: controller.signal } : init);
    const body: unknown = await res.json().catch(() => undefined);
    if (res.status === 401) return { kind: 'unauthorized', error: serverError(body) ?? unauthorizedMessage };
    const data = res.ok && isRecord(body) && body.ok === true ? parse(body.data) : undefined;
    if (data !== undefined) return { kind: 'ok', data };
    const fallback = res.ok ? API_MESSAGES.badResponse : res.status >= 500 ? API_MESSAGES.server : API_MESSAGES.request;
    return { kind: 'error', error: serverError(body) ?? fallback, status: res.status };
  } catch {
    return { kind: 'error', error: API_MESSAGES.network, status: 0 };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
