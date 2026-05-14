import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL, fetchWithAuth } from '../config/api';

const hideScrollbarStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
};

export const GAME_LAUNCH_URL_KEY_PREFIX = 'eagle_game_launch_url_';
export const GAME_LAUNCH_NAME_KEY_PREFIX = 'eagle_game_launch_name_';
/** '1' = iframe OK, '0' = open new tab only */
export const GAME_LAUNCH_EMBED_KEY_PREFIX = 'eagle_game_embed_';

const GamesSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingCode, setLaunchingCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/games`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (json.success && Array.isArray(json.data)) {
            setGames(json.data);
          } else {
            setGames([]);
          }
        }
      } catch {
        if (!cancelled) setError(t('games_loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load catalog once on mount
  }, []);

  const handlePlay = useCallback(
    async (game) => {
      const gameCode = game?.gameCode;
      if (!gameCode) return;
      const canLaunch = !!(game.launchUrl && String(game.launchUrl).trim());
      if (!canLaunch) return;
      setLaunchingCode(gameCode);
      setError('');
      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/games/launch/${encodeURIComponent(gameCode)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        );
        const json = await res.json().catch(() => ({}));
        const embedAllowed = json.embedAllowed !== false;
        if (!res.ok || !json.success || !json.launchUrl) {
          setError(json.message || t('games_launchError'));
          return;
        }
        const launchUrl = json.launchUrl;
        if (!embedAllowed) {
          window.open(launchUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        const codeForRoute = encodeURIComponent(gameCode);
        const gameName = String(game?.name || gameCode);
        try {
          sessionStorage.setItem(`${GAME_LAUNCH_URL_KEY_PREFIX}${gameCode}`, launchUrl);
          sessionStorage.setItem(`${GAME_LAUNCH_NAME_KEY_PREFIX}${gameCode}`, gameName);
          sessionStorage.setItem(`${GAME_LAUNCH_EMBED_KEY_PREFIX}${gameCode}`, '1');
        } catch (_) {}
        navigate(`/games/play/${codeForRoute}`, {
          state: { launchUrl, gameName, embedAllowed: true },
        });
      } catch {
        setError(t('games_launchError'));
      } finally {
        setLaunchingCode(null);
      }
    },
    [navigate, t]
  );

  return (
    <section className="w-full max-w-full px-4 md:px-6 pt-2 pb-3 md:pb-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white text-lg md:text-xl font-semibold leading-tight">
            {t('games_sectionTitle')}
          </h2>
          <p className="text-[#AAB3C5] text-xs md:text-sm mt-0.5">
            {t('games_sectionSubtitle')}
          </p>
        </div>
        <span className="hidden sm:inline-flex shrink-0 rounded-full bg-[#1a74e5]/20 border border-[#1a74e5]/50 text-[#cbe0ff] text-[10px] md:text-xs font-semibold px-2.5 py-1">
          {t('games_tapPlay')}
        </span>
      </div>

      {error ? (
        <p className="text-red-400 text-sm mb-2" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[#AAB3C5] text-sm">{t('games_loading')}</p>
      ) : games.length === 0 ? (
        <p className="text-[#AAB3C5] text-sm">{t('games_empty')}</p>
      ) : (
        <div
          className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={hideScrollbarStyle}
        >
          {games.map((game) => {
            const code = game.gameCode;
            const busy = launchingCode === code;
            const canLaunch = !!(game.launchUrl && String(game.launchUrl).trim());
            return (
              <button
                key={game._id || code}
                type="button"
                disabled={busy || !canLaunch}
                onClick={() => handlePlay(game)}
                aria-label={`${canLaunch ? t('games_play') : t('games_soon')} ${game.name}`}
                className={`group relative w-[150px] sm:w-[180px] md:w-[220px] aspect-[4/3] rounded-xl overflow-hidden shrink-0 snap-start ring-1 ring-white/10 text-left transition-transform duration-200 ${
                  canLaunch ? 'hover:-translate-y-0.5' : 'opacity-75 cursor-not-allowed'
                } disabled:opacity-60`}
              >
                <img
                  src={game.image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
                <span className="absolute top-2 right-2 text-[10px] md:text-xs font-semibold text-white bg-[#1a74e5] px-2 py-0.5 rounded-full shadow-md pointer-events-none">
                  {busy ? t('loading') : canLaunch ? t('games_play') : t('games_soon')}
                </span>
                <div className="absolute left-3 bottom-2.5 pointer-events-none">
                  <p className="text-[10px] md:text-xs text-white/65 leading-none">
                    {t('games_gameLabel')}
                  </p>
                  <h3 className="text-white text-sm md:text-base font-medium leading-tight flex items-center gap-1">
                    {game.name}
                    <span className="text-xs text-white/80">{'->'}</span>
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default GamesSection;
