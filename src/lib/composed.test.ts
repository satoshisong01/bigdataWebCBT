import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MAX_COMPOSED, getComposedIds, saveComposedIds } from '@/lib/composed';

const KEY = 'bigdata-cbt-composed';

function stored(): unknown {
  const raw = localStorage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('composed set pins', () => {
  it('returns undefined until a set is pinned, then its ids in exam order', () => {
    expect(getComposedIds('mock-7')).toBeUndefined();
    saveComposedIds('mock-7', ['5-3', '1-1', 't1-20']);
    expect(getComposedIds('mock-7')).toEqual(['5-3', '1-1', 't1-20']);
    expect(getComposedIds('mock-8')).toBeUndefined();
    expect(stored()).toEqual([{ key: 'mock-7', ids: ['5-3', '1-1', 't1-20'] }]);
  });

  it('keeps the newest pin first and replaces an older pin of the same key', () => {
    saveComposedIds('mock-1', ['1-1']);
    saveComposedIds('pool-weak-2', ['2-1']);
    saveComposedIds('mock-1', ['1-2', '1-3']);
    expect(stored()).toEqual([
      { key: 'mock-1', ids: ['1-2', '1-3'] },
      { key: 'pool-weak-2', ids: ['2-1'] },
    ]);
  });

  it(`keeps only the ${MAX_COMPOSED} most recently pinned keys`, () => {
    expect(MAX_COMPOSED).toBe(30);
    for (let i = 0; i <= MAX_COMPOSED; i++) saveComposedIds(`mock-${i}`, [`5-${i + 1}`]);
    expect(getComposedIds('mock-0')).toBeUndefined();
    expect(getComposedIds('mock-1')).toEqual(['5-2']);
    saveComposedIds('mock-1', ['5-2']); // re-pinning (reuse) makes it the most recent again
    saveComposedIds('pool-topic-3.1.1', ['5-41']);
    expect(getComposedIds('mock-1')).toEqual(['5-2']);
    expect(getComposedIds('mock-2')).toBeUndefined();
    expect(stored()).toHaveLength(MAX_COMPOSED);
  });

  it('ignores an empty key or id list', () => {
    saveComposedIds('mock-1', []);
    saveComposedIds('', ['1-1']);
    expect(stored()).toBeNull();
  });

  it('survives corrupt storage and skips malformed or repeated entries', () => {
    localStorage.setItem(KEY, '{not json');
    expect(getComposedIds('mock-1')).toBeUndefined();
    localStorage.setItem(KEY, JSON.stringify({ key: 'mock-1', ids: ['1-1'] }));
    expect(getComposedIds('mock-1')).toBeUndefined();
    localStorage.setItem(KEY, JSON.stringify([
      'junk',
      null,
      { key: 'mock-1', ids: [1, 2] },
      { key: 'mock-2', ids: [] },
      { key: '', ids: ['1-1'] },
      { key: 'mock-3', ids: ['3-1', '3-1', '3-2'] },
      { key: 'mock-3', ids: ['9-9'] },
    ]));
    expect(getComposedIds('mock-1')).toBeUndefined();
    expect(getComposedIds('mock-2')).toBeUndefined();
    expect(getComposedIds('mock-3')).toEqual(['3-1', '3-2']);
    saveComposedIds('mock-4', ['4-1']);
    expect(stored()).toEqual([{ key: 'mock-4', ids: ['4-1'] }, { key: 'mock-3', ids: ['3-1', '3-2'] }]);
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => saveComposedIds('mock-1', ['1-1'])).not.toThrow();
    expect(getComposedIds('mock-1')).toBeUndefined();
  });
});
