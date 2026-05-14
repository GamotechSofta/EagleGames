/**
 * Craft / partner games: embedding is controlled by the game host (CSP / X-Frame-Options).
 * When embedding is impossible, open the launch URL at top level instead of an iframe.
 */

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** Hosts known to reject cross-site iframe embedding (same URL works in a top-level window). */
export function hostBlocksIframeEmbed(url) {
  try {
    const h = new URL(String(url).trim()).hostname.toLowerCase();
    return h === 'roulettegame.craftdigital.in' || h.endsWith('.roulettegame.craftdigital.in');
  } catch {
    return false;
  }
}

function forceNewTabGameCode(gameCode) {
  const raw = import.meta.env.VITE_FORCE_NEW_TAB_GAME_CODES || '';
  const set = new Set(
    String(raw)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
  return set.has(String(gameCode || '').trim().toUpperCase());
}

/**
 * @param {string} launchUrl
 * @param {string} gameCode
 * @param {boolean} [partnerEmbedAllowed=true] — false when API says embedding is not allowed
 * @returns {boolean} if true, use top-level navigation (not an iframe)
 */
export function partnerRequiresTopLevelNavigation(launchUrl, gameCode, partnerEmbedAllowed = true) {
  if (!isHttpUrl(launchUrl)) return false;
  if (partnerEmbedAllowed === false) return true;
  if (hostBlocksIframeEmbed(launchUrl)) return true;
  return forceNewTabGameCode(gameCode);
}
