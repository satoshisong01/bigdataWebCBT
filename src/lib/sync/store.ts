/** Fail-safe JSON access to a (possibly missing or disabled) Web Storage. */

/** Resolved lazily: undefined on the server or when storage is disabled. */
export type StorageGetter = () => Storage | undefined;

export function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined; // storage disabled (privacy mode)
  }
}

/** Parsed value, or undefined when missing, corrupt or unreadable. */
export function readJson(storage: StorageGetter, key: string): unknown {
  try {
    const raw = storage()?.getItem(key) ?? null;
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** False when the value could not be stored (quota, disabled storage, server). */
export function writeJson(storage: StorageGetter, key: string, value: unknown): boolean {
  const target = storage();
  if (!target) return false;
  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(storage: StorageGetter, key: string): void {
  try {
    storage()?.removeItem(key);
  } catch { /* storage disabled */ }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
