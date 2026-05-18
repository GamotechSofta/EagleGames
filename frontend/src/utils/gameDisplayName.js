/**
 * Localized catalog game title (API `name` is English fallback).
 */
export function getGameDisplayName(t, game) {
  const code = String(game?.gameCode || '').trim().toUpperCase();
  if (code) {
    const key = `game_name_${code}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  const name = String(game?.name || '').trim();
  if (name) return name;
  return t('games_unnamed');
}
