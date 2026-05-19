import {
  API_BASE_URL,
  clearUserSession,
  fetchWithAuth,
  getAuthHeaders,
  getPlayerLaunchContext,
} from '../config/api';

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** Parse launch URL from POST /games/launch/:gameCode response. */
export function parseLaunchResponse(data) {
  if (!data || typeof data !== 'object') return '';
  return (
    data.launchUrl ||
    data.data?.launchUrl ||
    data.data?.data?.launchUrl ||
    data.data?.url ||
    data.data?.gameUrl ||
    data.data?.sessionUrl ||
    data.data?.redirectUrl ||
    ''
  ).trim();
}

export function gameLaunchSessionKeys(gameCode) {
  const c = String(gameCode || '').trim().toUpperCase();
  return {
    url: `eagleGames:v1:gameLaunch:url:${c}`,
    name: `eagleGames:v1:gameLaunch:name:${c}`,
    embed: `eagleGames:v1:gameLaunch:embed:${c}`,
  };
}

export function getDefaultGameReturnUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/games`;
  }
  return '';
}

/**
 * POST /api/v1/games/launch/:gameCode — returns { ok, data, launchUrl, embedAllowed, errorMessage }.
 */
export async function requestGameLaunch(gameCode) {
  const code = String(gameCode || '').trim().toUpperCase();
  const { token, externalPlayerId } = getPlayerLaunchContext();

  if (!code) {
    return { ok: false, errorMessage: 'Invalid game', code: 'INVALID_GAME' };
  }
  if (!token || !externalPlayerId) {
    return { ok: false, errorMessage: 'Please log in again to play.', code: 'AUTH_REQUIRED' };
  }

  const payload = {
    gameCode: code,
    externalPlayerId,
    token,
    currency: 'INR',
    locale: typeof navigator !== 'undefined' ? (navigator.language || 'en').slice(0, 2) : 'en',
    returnUrl: getDefaultGameReturnUrl(),
  };

  const res = await fetchWithAuth(`${API_BASE_URL}/games/launch/${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
    logoutOn401: false,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    if (data.code === 'TOKEN_EXPIRED') {
      clearUserSession();
      return { ok: false, errorMessage: data.message, code: 'TOKEN_EXPIRED', authExpired: true };
    }
    return {
      ok: false,
      errorMessage: data.message || 'Please log in again to play.',
      code: data.code || 'AUTH_REQUIRED',
    };
  }

  const launchUrl = parseLaunchResponse(data);
  const success = res.ok && data?.success !== false && isHttpUrl(launchUrl);

  return {
    ok: success,
    data,
    launchUrl: success ? launchUrl : '',
    embedAllowed: data?.embedAllowed !== false,
    errorMessage: success ? '' : data?.message || 'Could not start the game.',
    code: data?.code,
    partnerStatus: data?.partnerStatus,
  };
}

export function storeLaunchSession(gameCode, launchUrl, gameName, embedAllowed) {
  try {
    const k = gameLaunchSessionKeys(gameCode);
    sessionStorage.setItem(k.url, launchUrl);
    sessionStorage.setItem(k.name, gameName);
    sessionStorage.setItem(k.embed, embedAllowed ? '1' : '0');
  } catch (_) {}
}

export async function fetchGamesCatalog() {
  const res = await fetch(`${API_BASE_URL}/games`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (json.success && Array.isArray(json.data)) {
    return { ok: true, games: json.data };
  }
  return { ok: false, games: [], message: json.message || 'Could not load games.' };
}
