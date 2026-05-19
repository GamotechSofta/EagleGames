/** Shared launch URL helpers for catalog + launchGame. */

export const isHttpUrl = (value) =>
    typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** Substitute {placeholder} tokens (case-insensitive). Values are URL-encoded. */
export function renderLaunchUrlTemplate(template, replacements = {}) {
    if (typeof template !== 'string') return '';
    let result = template;
    for (const [key, rawValue] of Object.entries(replacements)) {
        const value = rawValue == null ? '' : String(rawValue);
        const pattern = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
        result = result.replace(pattern, encodeURIComponent(value));
    }
    return result;
}

export function getPublicGameBaseUrl() {
    const port = Number(process.env.PORT) || 3010;
    return (process.env.PUBLIC_GAME_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
}

/** Mongo `launchUrl` wins; optional per-game env overrides when DB field is empty. */
export function resolveDirectLaunchTemplate(gameCode, storedLaunchUrl) {
    const st = typeof storedLaunchUrl === 'string' ? storedLaunchUrl.trim() : '';
    if (st) return storedLaunchUrl;

    const code = String(gameCode || '').trim().toUpperCase();
    if (code === 'AVIATOR') return process.env.AVIATOR_LAUNCH_URL?.trim() || '';
    if (code === 'ROULETTE') {
        return (
            process.env.ROULETTE_LAUNCH_URL?.trim()
            || `${getPublicGameBaseUrl()}/games-static/roulette/index.html?player={playerId}`
        );
    }
    if (code === 'FUNTIMER') {
        return (
            process.env.FUNTIMER_LAUNCH_URL?.trim()
            || `${getPublicGameBaseUrl()}/games-static/funtimer/index.html?player={playerId}`
        );
    }
    return '';
}
