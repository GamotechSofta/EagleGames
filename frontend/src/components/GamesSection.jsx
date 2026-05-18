import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import { partnerRequiresTopLevelNavigation } from '../utils/partnerGameEmbed';
import { getGameDisplayName } from '../utils/gameDisplayName';

function gameLaunchSessionKeys(gameCode) {
  const c = String(gameCode || '').trim().toUpperCase();
  return {
    url: `eagleGames:v1:gameLaunch:url:${c}`,
    name: `eagleGames:v1:gameLaunch:name:${c}`,
    embed: `eagleGames:v1:gameLaunch:embed:${c}`,
  };
}

const hideScrollbarStyle = {
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
};

const getPlayerId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user?._id || user?.id || '').trim();
  } catch {
    return '';
  }
};

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
      const rawCode = game?.gameCode;
      if (!rawCode) return;

      const gameCode = String(rawCode).trim().toUpperCase();
      const externalPlayerId = getPlayerId();
      if (!externalPlayerId) {
        setError(t('games_err_loginPlayer'));
        return;
      }

      setLaunchingCode(gameCode);
      setError('');
      try {
        const payload = {
          gameCode,
          externalPlayerId,
          currency: 'INR',
          locale: 'en',
          returnUrl: '',
        };

        const res = await fetchWithAuth(
          `${API_BASE_URL}/games/launch/${encodeURIComponent(gameCode)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json().catch(() => ({}));
        const launchUrl =
          json?.launchUrl ||
          json?.data?.launchUrl ||
          json?.data?.data?.launchUrl ||
          json?.data?.url ||
          json?.data?.gameUrl ||
          json?.data?.sessionUrl ||
          json?.data?.redirectUrl ||
          '';

        if (!res.ok || !json.success || !launchUrl) {
          setError(json.message || t('games_launchError'));
          return;
        }

        const codeForRoute = encodeURIComponent(gameCode);
        const gameName = getGameDisplayName(t, game) || gameCode;
        const embedAllowed = json?.embedAllowed !== false;
        if (partnerRequiresTopLevelNavigation(launchUrl, gameCode, embedAllowed)) {
          window.location.assign(String(launchUrl).trim());
          return;
        }
        try {
          const k = gameLaunchSessionKeys(gameCode);
          sessionStorage.setItem(k.url, launchUrl);
          sessionStorage.setItem(k.name, gameName);
          sessionStorage.setItem(k.embed, embedAllowed ? '1' : '0');
        } catch (_) {}
        navigate(`/games/play/${codeForRoute}`, {
          state: { launchUrl, gameName, embedAllowed },
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
            const code = String(game.gameCode || '').trim().toUpperCase();
            const busy = launchingCode === code;
            const displayName = getGameDisplayName(t, game);
            return (
              <button
                key={game._id || code}
                type="button"
                disabled={busy}
                onClick={() => handlePlay(game)}
                aria-label={`${t('games_play')} ${displayName}`}
                className="group relative w-[150px] sm:w-[180px] md:w-[220px] aspect-[4/3] rounded-xl overflow-hidden shrink-0 snap-start ring-1 ring-white/10 text-left transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                <img
                  src={game.image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
                <span className="absolute top-2 right-2 text-[10px] md:text-xs font-semibold text-white bg-[#1a74e5] px-2 py-0.5 rounded-full shadow-md pointer-events-none">
                  {busy ? t('loading') : t('games_play')}
                </span>
                <div className="absolute left-3 bottom-2.5 pointer-events-none">
                  <p className="text-[10px] md:text-xs text-white/65 leading-none">
                    {t('games_gameLabel')}
                  </p>
                  <h3 className="text-white text-sm md:text-base font-medium leading-tight flex items-center gap-1">
                    {displayName}
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
