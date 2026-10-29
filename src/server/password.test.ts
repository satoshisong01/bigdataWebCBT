// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isAcceptableNewPassword,
  isValidUsername,
  normalizeUsername,
} from './account-rules';
import { hashPassword, verifyDummy, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('produces scrypt$16384$8$1$<16-byte salt>$<64-byte key>', async () => {
    const parts = (await hashPassword('correct horse')).split('$');
    expect(parts.slice(0, 4)).toEqual(['scrypt', '16384', '8', '1']);
    expect(Buffer.from(parts[4], 'base64')).toHaveLength(16);
    expect(Buffer.from(parts[5], 'base64')).toHaveLength(64);
  });

  it('accepts only the right password', async () => {
    const stored = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', stored)).toBe(true);
    expect(await verifyPassword('correct horsE', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });

  it('matches composed and decomposed forms of the same characters', async () => {
    const stored = await hashPassword('빅데이터합격');
    expect(await verifyPassword('빅데이터합격'.normalize('NFD'), stored)).toBe(true);
  });

  it.each([
    '',
    'bcrypt$16384$8$1$c2FsdHNhbHRzYWx0$aGFzaA==',
    'scrypt$16384$8$1$c2FsdHNhbHRzYWx0',
    'scrypt$1000$8$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA==',
    'scrypt$1048576$8$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA==',
    'scrypt$16384$64$1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA==',
    'scrypt$16384$8$1$!!!$aGFzaGhhc2hoYXNoaGFzaA==',
    'scrypt$16384$8$1$c2FsdA==$aGFzaGhhc2hoYXNoaGFzaA==',
  ])('treats a malformed stored hash as a mismatch: %j', async (stored) => {
    expect(await verifyPassword('anything', stored)).toBe(false);
  });

  it('the dummy check for unknown usernames is always false', async () => {
    expect(await verifyDummy('anything')).toBe(false);
    expect(await verifyDummy('')).toBe(false);
  });
});

describe('account rules', () => {
  it('normalizes usernames: trim, NFKC, lowercase', () => {
    expect(normalizeUsername('  Alice ')).toBe('alice');
    expect(normalizeUsername('ＢＯＢ')).toBe('bob');
  });

  it.each([
    ['alice', true],
    ['a.b_c-d@e', true],
    ['7user', true],
    ['a'.repeat(64), true],
    ['a'.repeat(65), false],
    ['', false],
    ['-abc', false],
    ['a b', false],
    ['한글', false],
  ])('isValidUsername(%j) → %s', (username, expected) => {
    expect(isValidUsername(username)).toBe(expected);
  });

  it(`new passwords need ${PASSWORD_MIN_LENGTH}..${PASSWORD_MAX_LENGTH} characters`, () => {
    expect(isAcceptableNewPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
    expect(isAcceptableNewPassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(isAcceptableNewPassword('a'.repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(isAcceptableNewPassword('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });
});
