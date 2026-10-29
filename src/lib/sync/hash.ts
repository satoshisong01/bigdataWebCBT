/**
 * Change detection for sync records: FNV-1a (32-bit) over key-sorted JSON.
 * Not a security hash — it only answers "did this record change since it was last synced?".
 */

/** JSON.stringify with object keys sorted at every level, so equal values always serialize identically. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item === undefined ? null : item)).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Readonly<Record<string, unknown>>;
    const fields = Object.keys(record)
      .filter(k => record[k] !== undefined)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stableStringify(record[k])}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a over UTF-16 code units, as 8 hex digits. */
export function fnv1a(text: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashValue(value: unknown): string {
  return fnv1a(stableStringify(value));
}

/** Hash of a missing record / tombstone. */
export const NULL_HASH: string = hashValue(null);

/** UTF-8 byte length (surrogate pairs counted as 6 — an over-estimate is fine for size limits). */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
  }
  return bytes;
}
