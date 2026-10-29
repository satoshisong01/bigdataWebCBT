import { describe, it, expect } from 'vitest';
import { hostnameOf, isAppPath, isExternalUrl } from './links';

describe('guide link helpers', () => {
  it('accepts only http(s) URLs as external', () => {
    expect(isExternalUrl('https://www.dataq.or.kr/')).toBe(true);
    expect(isExternalUrl('HTTP://example.com/a')).toBe(true);
    expect(isExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isExternalUrl('data:text/html,hi')).toBe(false);
    expect(isExternalUrl('https://')).toBe(false);
    expect(isExternalUrl('/guide')).toBe(false);
  });

  it('accepts only same-origin app paths as internal', () => {
    expect(isAppPath('/concepts?topic=1.1.1')).toBe(true);
    expect(isAppPath('/')).toBe(true);
    expect(isAppPath('//evil.example/x')).toBe(false);
    expect(isAppPath('/\\evil.example')).toBe(false);
    expect(isAppPath('concepts')).toBe(false);
    expect(isAppPath('javascript:alert(1)')).toBe(false);
  });

  it('extracts a short hostname', () => {
    expect(hostnameOf('https://www.dataq.or.kr/www/main.do')).toBe('dataq.or.kr');
    expect(hostnameOf('https://cafe.naver.com/x')).toBe('cafe.naver.com');
    expect(hostnameOf('not a url')).toBe('');
  });
});
