import { CSRF_COOKIE_NAME } from './constants';

/** Read a cookie by name (same-origin; used to mirror double-submit CSRF token into headers). */
export function readCookie(name: string): string | null {
  const escaped = name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&');
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function readCsrfCookie(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}
