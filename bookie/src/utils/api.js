const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
/** Player app base URL for referral links (`/login?ref=`). Override with VITE_FRONTEND_URL at build time if needed. */
const FRONTEND_URL =
    import.meta.env.VITE_FRONTEND_URL ||
    (import.meta.env.PROD ? 'https://www.eaglegames.fun' : 'http://localhost:5173');

export const getBookieAuthHeaders = () => {
    const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
    const token = bookie?.token || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

/** Bearer only — use with FormData (do not set Content-Type). */
export const getBookieAuthHeadersMultipart = () => {
    const bookie = JSON.parse(localStorage.getItem('bookie') || '{}');
    const token = bookie?.token || '';
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

/** Clear bookie session and redirect to login. Use on 401 or suspend. */
export const clearBookieSession = () => {
    localStorage.removeItem('bookie');
    window.location.href = '/';
};

/**
 * Fetch with bookie auth headers. On 401, clears session and redirects to login.
 */
export async function fetchWithAuth(url, options = {}) {
    const headers = { ...getBookieAuthHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        clearBookieSession();
        return res;
    }
    return res;
}

export const getReferralUrl = (bookieId) => {
    return `${FRONTEND_URL}/login?ref=${bookieId}`;
};

/**
 * Display name for a market based on current language.
 * Uses Hindi name when language is 'hi' and market has name_hi/marketNameHi; otherwise English name.
 * Names are stored per language (not auto-translated).
 */
export const getMarketDisplayName = (market, language) => {
    if (!market) return '';
    const ml = market.marketNameMl ?? market.name_ml ?? '';
    const kn = market.marketNameKn ?? market.name_kn ?? '';
    const ta = market.marketNameTa ?? market.name_ta ?? '';
    const te = market.marketNameTe ?? market.name_te ?? '';
    const mr = market.marketNameMr ?? market.name_mr ?? '';
    const hi = market.marketNameHi ?? market.name_hi ?? '';
    const en = market.marketName ?? market.name ?? '';
    if (language === 'ml' && ml) return ml;
    if (language === 'kn' && kn) return kn;
    if (language === 'ta' && ta) return ta;
    if (language === 'te' && te) return te;
    if (language === 'mr' && mr) return mr;
    if (language === 'hi' && hi) return hi;
    return en || hi || mr || te || ta || kn || ml;
};

/** Markets list with optional filters + lang for localized `name` from API. */
export const buildGetMarketsUrl = (language, query = {}) => {
    const params = new URLSearchParams({ lang: language || 'en', ...query });
    return `${API_BASE_URL}/markets/get-markets?${params}`;
};

export { API_BASE_URL, FRONTEND_URL };
