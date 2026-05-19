import { partnerRequiresTopLevelNavigation } from './partnerGameEmbed';
import { gameLaunchSessionKeys, storeLaunchSession } from '../api/games';

/**
 * After a successful launch API call: iframe route, new tab, or full-page assign.
 * @returns {'iframe' | 'assigned' | 'noop'} — assigned = left SPA for partner top-level URL
 */
export function openLaunchedGame({
  navigate,
  gameCode,
  gameName,
  launchUrl,
  playableUrl,
  embedAllowed,
  useEmbedProxy = false,
}) {
  const code = String(gameCode || '').trim().toUpperCase();
  const partnerUrl = String(launchUrl || '').trim();
  const iframeSrc = String(playableUrl || partnerUrl).trim();
  const name = String(gameName || code).trim();

  if (
    !useEmbedProxy &&
    partnerRequiresTopLevelNavigation(partnerUrl, code, embedAllowed)
  ) {
    window.location.assign(partnerUrl);
    return 'assigned';
  }

  storeLaunchSession(code, iframeSrc, name, embedAllowed);
  navigate(`/games/play/${encodeURIComponent(code)}`, {
    state: {
      launchUrl: iframeSrc,
      partnerLaunchUrl: partnerUrl,
      gameName: name,
      embedAllowed,
      useEmbedProxy,
    },
  });
  return 'iframe';
}

export function readStoredLaunch(gameCode) {
  const k = gameLaunchSessionKeys(gameCode);
  try {
    return {
      launchUrl: sessionStorage.getItem(k.url) || '',
      gameName: sessionStorage.getItem(k.name) || '',
      embedAllowed: sessionStorage.getItem(k.embed) !== '0',
    };
  } catch {
    return { launchUrl: '', gameName: '', embedAllowed: true };
  }
}

export function clearStoredLaunch(gameCode) {
  try {
    const k = gameLaunchSessionKeys(gameCode);
    sessionStorage.removeItem(k.url);
    sessionStorage.removeItem(k.name);
    sessionStorage.removeItem(k.embed);
  } catch (_) {}
}
