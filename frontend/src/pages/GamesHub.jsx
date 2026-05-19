import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchGamesCatalog, requestGameLaunch } from '../api/games';
import { openLaunchedGame } from '../utils/gameLaunchFlow';
import { getGameDisplayName } from '../utils/gameDisplayName';

const GamesHub = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingCode, setLaunchingCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, games: list, message } = await fetchGamesCatalog();
      if (!cancelled) {
        if (ok) setGames(list);
        else setError(message || t('games_loadError'));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = useCallback(
    async (game) => {
      const rawCode = game?.gameCode;
      if (!rawCode) return;

      const gameCode = String(rawCode).trim().toUpperCase();
      setLaunchingCode(gameCode);
      setError('');

      const result = await requestGameLaunch(gameCode);
      if (!result.ok) {
        setError(result.errorMessage || t('games_launchError'));
        setLaunchingCode(null);
        return;
      }

      const gameName = getGameDisplayName(t, game) || gameCode;
      openLaunchedGame({
        navigate,
        gameCode,
        gameName,
        launchUrl: result.launchUrl,
        playableUrl: result.playableUrl,
        embedAllowed: result.embedAllowed,
        useEmbedProxy: result.useEmbedProxy,
      });
      setLaunchingCode(null);
    },
    [navigate, t]
  );

  return (
    <div className="min-h-screen bg-[#0b1220] px-4 py-6 md:px-6">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white">{t('games_hub_title')}</h1>
        <p className="text-[#AAB3C5] text-sm mt-1">{t('games_hub_subtitle')}</p>
      </header>

      {error ? (
        <p className="text-red-400 text-sm mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[#AAB3C5]">{t('games_loading')}</p>
      ) : games.length === 0 ? (
        <p className="text-[#AAB3C5]">{t('games_hub_empty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {games.map((game) => {
            const code = String(game.gameCode || '').trim().toUpperCase();
            const busy = launchingCode === code;
            const displayName = getGameDisplayName(t, game);
            return (
              <button
                key={game._id || code}
                type="button"
                disabled={busy}
                onClick={() => handlePlay(game)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden ring-1 ring-white/10 text-left transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                <img
                  src={game.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />
                <span className="absolute top-2 right-2 text-[10px] font-semibold text-white bg-[#1a74e5] px-2 py-0.5 rounded-full">
                  {busy ? t('games_hub_launching') : t('games_play')}
                </span>
                <div className="absolute left-3 bottom-2.5 pointer-events-none">
                  <p className="text-[10px] text-white/65">{t('games_gameLabel')}</p>
                  <h3 className="text-white text-sm font-medium">{displayName}</h3>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GamesHub;
