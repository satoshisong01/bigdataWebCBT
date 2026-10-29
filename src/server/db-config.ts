/**
 * Server-only, PURE: DB env → pg PoolConfig with the TLS policy of docs §7.1.
 * - localhost, 127.x, ::1 and dotless names starting with a letter (e.g. a docker service) → plain
 *   TCP (`ssl: false`); numeric dotless hosts (integer/hex IPv4 forms) are remote
 * - anything else → TLS with the CA from DB_CA_PEM_B64 and rejectUnauthorized; for an IPv4 host
 *   also `ssl.host`, so certificate checks run against that IP (SNI cannot carry an IP address).
 * - never a connection string (an sslmode in it would replace the ssl object); missing CA → throw.
 * Also loaded by scripts/db-setup.mjs through the TypeScript transpiler — type-only imports only.
 */
import type { PoolConfig } from 'pg';
import type { DbEnv } from './env';

export const POOL_OPTIONS = {
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
} as const;

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_RE = new RegExp(`^${OCTET}(\\.${OCTET}){3}$`);
const PEM_MARKER = '-----BEGIN CERTIFICATE-----';
const DOTLESS_NAME_RE = /^[a-z][a-z0-9_-]*$/;
const HEX_NUMBER_RE = /^0x[0-9a-f]+$/;

export function isIPv4(host: string): boolean {
  return IPV4_RE.test(host);
}

export function isLocalHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === 'localhost' || h === '::1') return true;
  if (isIPv4(h)) return h.startsWith('127.');
  // a dotless name counts as local only when it is a real label (docker service name): numeric
  // forms such as a decimal-integer or 0x-hex IPv4 resolve to remote hosts and must use TLS
  return DOTLESS_NAME_RE.test(h) && !HEX_NUMBER_RE.test(h);
}

export function buildPoolConfig(env: DbEnv): PoolConfig {
  const base: PoolConfig = {
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
    ...POOL_OPTIONS,
  };
  if (isLocalHost(env.host)) return { ...base, ssl: false };
  if (!env.caPemB64) {
    throw new Error('DB_CA_PEM_B64 is required when DB_HOST is not local (TLS is mandatory)');
  }
  const ca = Buffer.from(env.caPemB64, 'base64').toString('utf8');
  if (!ca.includes(PEM_MARKER)) {
    throw new Error('DB_CA_PEM_B64 must be the base64 encoding of a PEM certificate');
  }
  return {
    ...base,
    ssl: { ca, rejectUnauthorized: true, ...(isIPv4(env.host) ? { host: env.host } : {}) },
  };
}
