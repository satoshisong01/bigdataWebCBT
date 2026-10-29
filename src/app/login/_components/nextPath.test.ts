import { describe, it, expect } from 'vitest';
import { safeNextPath } from './nextPath';

const ORIGIN = 'https://app.example';

describe('safeNextPath', () => {
  it('keeps same-origin app paths with query and hash', () => {
    expect(safeNextPath('/settings', ORIGIN)).toBe('/settings');
    expect(safeNextPath('/concepts?topic=1.1.1#top', ORIGIN)).toBe('/concepts?topic=1.1.1#top');
    expect(safeNextPath('/', ORIGIN)).toBe('/');
  });

  it('falls back to home for missing or non-path values', () => {
    expect(safeNextPath(null, ORIGIN)).toBe('/');
    expect(safeNextPath(undefined, ORIGIN)).toBe('/');
    expect(safeNextPath('', ORIGIN)).toBe('/');
    expect(safeNextPath('settings', ORIGIN)).toBe('/');
  });

  it('rejects other origins and script URLs', () => {
    expect(safeNextPath('https://evil.example/x', ORIGIN)).toBe('/');
    expect(safeNextPath('//evil.example/x', ORIGIN)).toBe('/');
    expect(safeNextPath('/\\evil.example', ORIGIN)).toBe('/');
    expect(safeNextPath('/\t/evil.example', ORIGIN)).toBe('/');
    expect(safeNextPath('javascript:alert(1)', ORIGIN)).toBe('/');
  });

  it('never returns to /login or the API', () => {
    expect(safeNextPath('/login', ORIGIN)).toBe('/');
    expect(safeNextPath('/login?next=/settings', ORIGIN)).toBe('/');
    expect(safeNextPath('/api/auth/me', ORIGIN)).toBe('/');
  });
});
