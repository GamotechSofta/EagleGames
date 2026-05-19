/** Launch URL helpers — all games use partner GAME_LAUNCH_URL session API (no in-house static launch). */

export const isHttpUrl = (value) =>
    typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** Player return URL after partner session; body wins, then env, then first ALLOWED_ORIGINS + /games. */
export function resolveDefaultGameReturnUrl() {
    const bodyFallback =
        process.env.GAME_RETURN_URL?.trim()
        || process.env.FRONTEND_URL?.trim()
        || '';
    if (bodyFallback) return bodyFallback;
    const firstOrigin = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .find((o) => /^https?:\/\//i.test(o));
    return firstOrigin ? `${firstOrigin.replace(/\/$/, '')}/games` : '';
}
