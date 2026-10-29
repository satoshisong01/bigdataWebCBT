// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeError, isValidSchemaName, quoteSchema, readDbEnv, redactSecrets } from './env';
import { missingEnv, parseEnvFile } from './env-file';

// Obviously fake values (documentation names/ranges) — never real connection data.
const VALID = {
  DB_HOST: 'db.example.com',
  DB_PORT: '5432',
  DB_USER: 'app_owner',
  DB_PASS: 'not-a-real-secret',
  DB_NAME: 'app',
  DB_SCHEMA: 'study_app',
  DB_CA_PEM_B64: 'Zm9vYmFy',
};

function errorOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  return '';
}

describe('readDbEnv', () => {
  it('reads a complete environment', () => {
    expect(readDbEnv({ ...VALID, DB_HOST: ' db.example.com ', DB_PORT: '6543' })).toEqual({
      host: 'db.example.com',
      port: 6543,
      user: 'app_owner',
      password: 'not-a-real-secret',
      database: 'app',
      schema: 'study_app',
      caPemB64: 'Zm9vYmFy',
    });
  });

  it('leaves the CA out when it is not configured', () => {
    expect(readDbEnv({ ...VALID, DB_CA_PEM_B64: undefined })).not.toHaveProperty('caPemB64');
  });

  it('names every missing variable', () => {
    expect(errorOf(() => readDbEnv({ DB_HOST: 'db.example.com', DB_PASS: '  ' }))).toBe(
      'Missing environment variable(s): DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_SCHEMA',
    );
  });

  it.each(['0', '65536', '54x', '-1', '1.5'])('rejects DB_PORT=%s', (port) => {
    expect(errorOf(() => readDbEnv({ ...VALID, DB_PORT: port }))).toBe('DB_PORT must be an integer between 1 and 65535');
  });

  it.each(['Study', 'study-app', '1study', 'a'.repeat(64), 'x;drop', '"x"'])('rejects DB_SCHEMA=%j', (schema) => {
    expect(errorOf(() => readDbEnv({ ...VALID, DB_SCHEMA: schema }))).toBe('DB_SCHEMA must match ^[a-z_][a-z0-9_]{0,62}$');
  });

  it('never echoes a value in its errors', () => {
    const messages = [
      errorOf(() => readDbEnv({ ...VALID, DB_PORT: 'not-a-real-secret' })),
      errorOf(() => readDbEnv({ ...VALID, DB_SCHEMA: 'Not-A-Real-Secret' })),
      errorOf(() => readDbEnv({ ...VALID, DB_USER: '' })),
    ];
    for (const message of messages) {
      expect(message).not.toMatch(/secret|db\.example\.com|app_owner/i);
    }
  });
});

describe('schema identifiers', () => {
  it('accepts lowercase identifiers up to 63 chars', () => {
    expect(isValidSchemaName('bigdata_it_0a1b2c3d')).toBe(true);
    expect(isValidSchemaName('_x')).toBe(true);
    expect(isValidSchemaName('a'.repeat(63))).toBe(true);
    expect(isValidSchemaName('a'.repeat(64))).toBe(false);
    expect(isValidSchemaName('')).toBe(false);
  });

  it('quotes valid names and refuses anything else', () => {
    expect(quoteSchema('study_app')).toBe('"study_app"');
    expect(() => quoteSchema('a"b')).toThrow();
    expect(() => quoteSchema('public; drop table x')).toThrow();
  });
});

describe('redactSecrets / describeError', () => {
  const source = { DB_HOST: 'db.example.com', DB_USER: 'app_owner', DB_NAME: 'app', DB_PASS: 'not-a-real-secret' };

  it('masks credential values (longest first) and any IPv4 address', () => {
    const text = 'password authentication failed for user "app_owner" on app at db.example.com (203.0.113.10:5432) not-a-real-secret';
    expect(redactSecrets(text, source)).toBe(
      'password authentication failed for user "<DB_USER>" on <DB_NAME> at <DB_HOST> (<ip>:5432) <DB_PASS>',
    );
  });

  it('describes driver errors with their code, redacted', () => {
    const err = Object.assign(new Error('password authentication failed for user "app_owner"'), { code: '28P01' });
    expect(describeError(err, source)).toBe('Error [28P01]: password authentication failed for user "<DB_USER>"');
    expect(describeError('boom at 198.51.100.7', source)).toBe('boom at <ip>');
  });
});

describe('parseEnvFile', () => {
  it('follows dotenv rules for comments, export and quotes', () => {
    const text = [
      '# comment line',
      'A=1',
      'export B = two ',
      'C="quoted # not a comment"',
      "D='single'",
      'E=value # trailing comment',
      'F="line\\nbreak"',
      'G=',
      'not an assignment',
      'H=a=b=c',
      'I=`tick`',
      '',
    ].join('\r\n');
    expect(parseEnvFile(text)).toEqual({
      A: '1',
      B: 'two',
      C: 'quoted # not a comment',
      D: 'single',
      E: 'value',
      F: 'line\nbreak',
      G: '',
      H: 'a=b=c',
      I: 'tick',
    });
  });

  it('only fills variables that are not already set', () => {
    expect(missingEnv({ A: 'file', B: 'file' }, { A: 'shell', C: 'shell' })).toEqual({ B: 'file' });
  });
});
