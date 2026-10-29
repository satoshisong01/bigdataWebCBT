// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseChangePasswordRequest, parseLoginRequest } from './auth-input';

describe('parseLoginRequest', () => {
  it('accepts username/password/remember', () => {
    expect(parseLoginRequest({ username: 'alice', password: 'secret1', remember: false })).toEqual({
      username: 'alice',
      password: 'secret1',
      remember: false,
    });
  });

  it('defaults remember to true ("로그인 상태 유지" is on by default)', () => {
    expect(parseLoginRequest({ username: 'alice', password: 'secret1' })?.remember).toBe(true);
  });

  it.each([
    null,
    'alice',
    ['alice', 'secret1'],
    {},
    { username: '', password: 'secret1' },
    { username: 'alice', password: '' },
    { username: 'alice', password: 123456 },
    { username: 'alice', password: 'x'.repeat(257) },
    { username: 'alice', password: 'secret1', remember: 'yes' },
  ])('rejects %j', (body) => {
    expect(parseLoginRequest(body)).toBeNull();
  });
});

describe('parseChangePasswordRequest', () => {
  it('accepts current/next, letting a short `next` through for the specific message', () => {
    expect(parseChangePasswordRequest({ current: 'old-pass', next: 'new-pass-1' })).toEqual({
      current: 'old-pass',
      next: 'new-pass-1',
    });
    expect(parseChangePasswordRequest({ current: 'old-pass', next: '' })).toEqual({ current: 'old-pass', next: '' });
  });

  it.each([
    null,
    { next: 'new-pass-1' },
    { current: '', next: 'new-pass-1' },
    { current: 'old-pass', next: 12345678 },
    { current: 'old-pass', next: 'x'.repeat(257) },
  ])('rejects %j', (body) => {
    expect(parseChangePasswordRequest(body)).toBeNull();
  });
});
