/**
 * Account/sync UI: pure label helpers plus render smoke tests of the header chip, the settings
 * '계정·동기화' panel and the /login form against a seeded sync meta (no network).
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import AccountChip from './AccountChip';
import { syncAgoLabel, syncChipLabel, syncResultMessage } from './syncStatus';
import AccountPanel from '@/app/settings/_components/AccountPanel';
import { passwordFormError } from '@/app/settings/_components/PasswordForm';
import LoginContent from '@/app/login/_components/LoginContent';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('next=/settings'),
}));

const NOW = Date.parse('2026-10-29T12:00:00.000Z');
const minutesAgo = (m: number): string => new Date(NOW - m * 60_000).toISOString();

function render(component: ComponentType): string {
  return renderToString(createElement(component)).replace(/<!-- -->/g, '');
}

function seedLoggedIn(extra: Record<string, unknown> = {}): void {
  localStorage.setItem('bigdata-cbt-sync', JSON.stringify({
    username: 'tester', userId: 7, device: 'device_1', cursor: '0', synced: {}, dirty: {}, initialDone: true,
    lastSyncAt: new Date(Date.now() - 3 * 60_000).toISOString(), ...extra,
  }));
}

describe('sync labels', () => {
  it('formats the time since the last sync', () => {
    expect(syncAgoLabel(undefined, NOW)).toBe('');
    expect(syncAgoLabel('not a date', NOW)).toBe('');
    expect(syncAgoLabel(minutesAgo(0), NOW)).toBe('방금');
    expect(syncAgoLabel(minutesAgo(-2), NOW)).toBe('방금'); // clock skew
    expect(syncAgoLabel(minutesAgo(5), NOW)).toBe('5분 전');
    expect(syncAgoLabel(minutesAgo(125), NOW)).toBe('2시간 전');
    expect(syncAgoLabel(minutesAgo(3 * 24 * 60), NOW)).toBe('3일 전');
  });

  it('builds the header chip text with ⚠ on error', () => {
    expect(syncChipLabel({ syncing: false, lastSyncAt: minutesAgo(5) }, NOW)).toBe('☁ 5분 전 동기화');
    expect(syncChipLabel({ syncing: false, lastSyncAt: minutesAgo(5), lastError: 'x' }, NOW)).toBe('⚠ 5분 전 동기화');
    expect(syncChipLabel({ syncing: false }, NOW)).toBe('☁ 동기화 전');
    expect(syncChipLabel({ syncing: true, lastError: 'x' }, NOW)).toBe('☁ 동기화 중…');
  });

  it('describes a manual sync result', () => {
    expect(syncResultMessage({ status: 'ok', applied: 0, sent: 3, rounds: 1 })).toEqual({ tone: 'ok', text: '동기화했어요.' });
    expect(syncResultMessage({ status: 'ok', applied: 2, sent: 0, rounds: 1 }).text).toContain('2건');
    expect(syncResultMessage({ status: 'skipped', reason: 'offline' }).tone).toBe('error');
    expect(syncResultMessage({ status: 'skipped', reason: 'busy' }).tone).toBe('ok');
    expect(syncResultMessage({ status: 'error', error: '서버 오류', applied: 0 })).toEqual({ tone: 'error', text: '서버 오류' });
    expect(syncResultMessage({ status: 'unauthorized', error: '다시 로그인' }).text).toBe('다시 로그인');
  });
});

describe('passwordFormError', () => {
  it('checks current, length, confirmation and change', () => {
    expect(passwordFormError('', 'abcdef', 'abcdef')).toContain('현재 비밀번호');
    expect(passwordFormError('old', 'abc', 'abc')).toContain('6자 이상');
    expect(passwordFormError('old', 'abcdef', 'abcdeg')).toContain('서로 달라요');
    expect(passwordFormError('abcdef', 'abcdef', 'abcdef')).toContain('다른 비밀번호');
    expect(passwordFormError('old', 'abcdef', 'abcdef')).toBeNull();
  });
});

describe('account UI renders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logged out: header shows 로그인, settings links to /login, login form is empty', () => {
    expect(render(AccountChip)).toContain('href="/login"');
    const panel = render(AccountPanel);
    expect(panel).toContain('계정·동기화');
    expect(panel).toContain('/login?next=%2Fsettings');
    const login = render(LoginContent);
    expect(login).toMatch(/autocomplete="username"/i);
    expect(login).toMatch(/autocomplete="current-password"/i);
    expect(login).toContain('로그인 상태 유지');
    expect(login).toContain('회원가입은 없어요');
    expect(login).not.toContain('계정으로 로그인되어 있어요');
  });

  it('logged in: header chip, status panel, login notice, saved username prefill', () => {
    seedLoggedIn();
    localStorage.setItem('bigdata-cbt-saved-username', 'saved-id');
    const chip = render(AccountChip);
    expect(chip).toContain('tester');
    expect(chip).toContain('☁ 3분 전 동기화');
    expect(chip).toContain('href="/settings"');
    const panel = render(AccountPanel);
    expect(panel).toContain('tester');
    expect(panel).toContain('지금 동기화');
    expect(panel).toContain('비밀번호 변경');
    expect(panel).toContain('로그아웃');
    expect(panel).toContain('대기 중 변경');
    const login = render(LoginContent);
    expect(login).toContain('계정으로 로그인되어 있어요');
    expect(login).toContain('value="saved-id"');
  });

  it('logged in with a failed sync: ⚠ chip and the error in the panel', () => {
    seedLoggedIn({ lastError: '서버에 연결하지 못했어요.' });
    expect(render(AccountChip)).toContain('⚠ 3분 전 동기화');
    expect(render(AccountPanel)).toContain('서버에 연결하지 못했어요.');
  });
});
