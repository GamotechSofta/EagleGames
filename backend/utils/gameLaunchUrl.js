/** Shared defaults & env merge for catalog + launch (keep in sync with seedGames). */
export const AVIATOR_LAUNCH_DEFAULT = 'https://aviator-jet-theta.vercel.app/?uid={playerId}';

/**
 * Effective iframe URL template for a game.
 * Stored Mongo value wins if non-empty; otherwise env vars; otherwise catalog defaults (Aviator only).
 */
export function resolveEffectiveLaunchTemplate(gameCode, storedLaunchUrl) {
    const st = typeof storedLaunchUrl === 'string' ? storedLaunchUrl.trim() : '';
    if (st) return storedLaunchUrl;

    const code = String(gameCode || '').toUpperCase();
    if (code === 'AVIATOR') {
        return process.env.AVIATOR_LAUNCH_URL?.trim() || AVIATOR_LAUNCH_DEFAULT;
    }
    if (code === 'ROULETTE') {
        return (
            process.env.ROULETTE_LAUNCH_URL?.trim() ||
            process.env.GAMEZOP_ROULETTE_LAUNCH_URL?.trim() ||
            ''
        );
    }
    if (code === 'FUNTIMER') {
        return process.env.FUNTIMER_LAUNCH_URL?.trim() || '';
    }
    return '';
}
