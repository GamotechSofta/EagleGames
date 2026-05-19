// API Configuration – set VITE_API_BASE_URL in Render (or .env) for production.
// Local + production API without CORS: use VITE_API_BASE_URL=/api/v1 and Vite proxy (see vite.config.js + .env.development).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

/** Avoid stale CDN/browser cache when switching UI language; backend also reads x-lang. */
export function marketsListFetchInit(language) {
  const lang = (language || 'en').toString();
  return {
    cache: 'no-store',
    headers: { 'x-lang': lang },
  };
}

// Backend base URL for static assets (downloads, etc.) – derived from API or set via VITE_BACKEND_BASE_URL
const _api = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
const isRelativeApi = typeof _api === 'string' && _api.startsWith('/');
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  (isRelativeApi
    ? import.meta.env.VITE_DEV_PROXY_TARGET?.replace(/\/$/, '') || 'https://api.singlepana.in'
    : _api.replace(/\/api\/v1\/?$/, ''));

/**
 * Returns headers with Bearer token for authenticated player API calls.
 * Token is stored in localStorage user object after login.
 * For JSON body use: { 'Content-Type': 'application/json', ...getAuthHeaders() }
 * For FormData omit Content-Type (fetch sets multipart boundary).
 */
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function getAuthHeaders() {
  const token = getStoredUser()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Player id + JWT for game launch (body fallback if a proxy strips Authorization). */
export function getPlayerLaunchContext() {
  const user = getStoredUser();
  const token = user?.token ? String(user.token) : '';
  const externalPlayerId = String(user?.id || user?._id || '').trim();
  return { token, externalPlayerId };
}

/** Clear user session and redirect to login. Use on 401 or suspend. */
export function clearUserSession() {
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('userLogout'));
  window.location.href = '/login';
}

/**
 * Fetch with auth headers.
 * On 401, clears session and redirects to login unless `logoutOn401: false`
 * (use for game launch — partner errors must not be confused with JWT expiry).
 */
export async function fetchWithAuth(url, options = {}) {
  const { logoutOn401 = true, ...fetchOptions } = options;
  const headers = { ...getAuthHeaders(), ...(fetchOptions.headers || {}) };
  const res = await fetch(url, { ...fetchOptions, headers });
  if (res.status === 401 && logoutOn401) {
    clearUserSession();
    return res;
  }
  return res;
}
