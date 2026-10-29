const FALLBACK = '/';

/**
 * The `?next=` target after login: a same-origin app path only (path + query + hash), else '/'.
 * Rejects absolute / protocol-relative / backslash URLs, the API, and /login itself (no loop).
 */
export function safeNextPath(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return FALLBACK;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return FALLBACK;
    const path = url.pathname;
    if (path === '/login' || path.startsWith('/login/') || path.startsWith('/api/')) return FALLBACK;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
