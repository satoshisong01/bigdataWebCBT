/** In-memory Web Storage, one per simulated device (tests only). */
export interface MemoryStorage extends Storage {
  /** setItem throws for these keys (or for every key with '*'), like a full quota */
  failKeys: Set<string>;
}

export function createMemoryStorage(initial: Readonly<Record<string, string>> = {}): MemoryStorage {
  const data = new Map(Object.entries(initial));
  const storage: MemoryStorage = {
    failKeys: new Set<string>(),
    get length(): number {
      return data.size;
    },
    key: (index: number): string | null => Array.from(data.keys())[index] ?? null,
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      if (storage.failKeys.has('*') || storage.failKeys.has(key)) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      data.set(key, String(value));
    },
    removeItem: (key: string): void => {
      data.delete(key);
    },
    clear: (): void => data.clear(),
  };
  return storage;
}
