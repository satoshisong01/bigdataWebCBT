// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildPoolConfig, isIPv4, isLocalHost } from './db-config';
import type { DbEnv } from './env';

// Fake connection data only (example.com / TEST-NET addresses).
const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfakeCertificateBodyForTests\n-----END CERTIFICATE-----\n';
const BASE: DbEnv = {
  host: 'db.example.com',
  port: 5432,
  user: 'app_owner',
  password: 'not-a-real-secret',
  database: 'app',
  schema: 'study_app',
  caPemB64: Buffer.from(PEM, 'utf8').toString('base64'),
};

describe('TLS policy', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.10.20.30', '::1', 'postgres', 'db'])(
    '%s → plain TCP, no CA needed',
    (host) => {
      expect(buildPoolConfig({ ...BASE, host, caPemB64: undefined }).ssl).toBe(false);
    },
  );

  it('a remote hostname gets verified TLS with the decoded CA', () => {
    expect(buildPoolConfig(BASE).ssl).toEqual({ ca: PEM, rejectUnauthorized: true });
  });

  it('a remote IPv4 also pins ssl.host so the certificate is checked against that IP', () => {
    expect(buildPoolConfig({ ...BASE, host: '203.0.113.10' }).ssl).toEqual({
      ca: PEM,
      rejectUnauthorized: true,
      host: '203.0.113.10',
    });
  });

  it.each(['128.0.0.1', '10.0.0.5', '192.168.0.10', 'db.internal', 'fd00::1', '127.0.0.256', '3405803786', '0xcb00710a', '0Xcb00710a'])(
    '%s is remote and requires TLS',
    (host) => {
      expect(isLocalHost(host)).toBe(false);
      expect(() => buildPoolConfig({ ...BASE, host, caPemB64: undefined })).toThrow(
        'DB_CA_PEM_B64 is required when DB_HOST is not local (TLS is mandatory)',
      );
    },
  );

  it('refuses a CA that is not a base64 PEM certificate', () => {
    const notPem = Buffer.from('hello', 'utf8').toString('base64');
    expect(() => buildPoolConfig({ ...BASE, caPemB64: notPem })).toThrow(
      'DB_CA_PEM_B64 must be the base64 encoding of a PEM certificate',
    );
  });

  it('uses discrete fields, pool limits from the spec and never a connection string', () => {
    const config = buildPoolConfig(BASE);
    expect(config).toMatchObject({
      host: 'db.example.com',
      port: 5432,
      user: 'app_owner',
      password: 'not-a-real-secret',
      database: 'app',
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    expect(config.connectionString).toBeUndefined();
  });
});

describe('isIPv4', () => {
  it('accepts dotted quads only', () => {
    expect(isIPv4('203.0.113.10')).toBe(true);
    expect(isIPv4('0.0.0.0')).toBe(true);
    expect(isIPv4('255.255.255.255')).toBe(true);
    expect(isIPv4('256.1.1.1')).toBe(false);
    expect(isIPv4('01.2.3.4')).toBe(false);
    expect(isIPv4('1.2.3')).toBe(false);
    expect(isIPv4('db.example.com')).toBe(false);
  });
});
