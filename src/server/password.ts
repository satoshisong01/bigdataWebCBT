/**
 * Server-only: scrypt password hashes `scrypt$N$r$p$saltB64$hashB64` (docs §7.2).
 * Passwords are NFKC-normalized so the same characters typed on another device still match.
 * Also loaded by scripts/db-setup.mjs (create-user) — only node: built-ins may be imported.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16 } as const;

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Generous headroom over scrypt's ~128·N·r bytes, still bounded by the accepted parameters. */
function maxmemFor(N: number, r: number): number {
  return 256 * N * r;
}

function deriveKey(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (!isPowerOfTwo(N) || N < 1024 || N > 65536) return null;
  if (!Number.isInteger(r) || r < 1 || r > 16 || !Number.isInteger(p) || p < 1 || p > 4) return null;
  if (!B64_RE.test(parts[4]) || !B64_RE.test(parts[5])) return null;
  const salt = Buffer.from(parts[4], 'base64');
  const hash = Buffer.from(parts[5], 'base64');
  if (salt.length < 8 || hash.length < 16 || hash.length > 128) return null;
  return { N, r, p, salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  const { N, r, p, keylen, saltBytes } = SCRYPT_PARAMS;
  const salt = randomBytes(saltBytes);
  const hash = await deriveKey(password, salt, keylen, { N, r, p, maxmem: maxmemFor(N, r) });
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** False for a wrong password and for a malformed stored hash; comparison is constant-time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const { N, r, p, salt, hash } = parsed;
  const candidate = await deriveKey(password, salt, hash.length, { N, r, p, maxmem: maxmemFor(N, r) });
  return candidate.length === hash.length && timingSafeEqual(candidate, hash);
}

let dummyHash: Promise<string> | null = null;

/** Does the same scrypt work as a real check so unknown usernames take as long; always false. */
export async function verifyDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(18).toString('base64'));
  await verifyPassword(password, await dummyHash);
  return false;
}
