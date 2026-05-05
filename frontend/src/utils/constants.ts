export const API_BASE_URL = '/api/v1';
export const TOKEN_KEY = 'salam_air_token';
/** Must match Backend `app.core.csrf.CSRF_COOKIE_NAME` */
export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const THEME_KEY = 'salam_air_theme';

export const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent Portal',
  sales: 'Sales Portal',
  admin: 'Super Admin',
};

export const ROLE_COLORS: Record<string, string> = {
  agent: 'bg-teal-50 text-teal-700',
  sales: 'bg-teal-50 text-teal-700',
  admin: 'bg-purple-50 text-purple-700',
};
