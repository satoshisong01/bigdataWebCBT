/** URL helpers for guide content: only app paths and http(s) URLs are ever rendered as links. */

export function isExternalUrl(href: string): boolean {
  return /^https?:\/\/[^\s/]/i.test(href);
}

/** '/concepts?topic=1.1' yes; '//evil.example' (protocol-relative) and 'javascript:' no. */
export function isAppPath(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\');
}

/** 'https://www.dataq.or.kr/www/main.do' → 'dataq.or.kr'; '' when unparsable. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
