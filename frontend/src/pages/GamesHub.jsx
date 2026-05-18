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

const CARD_THEMES = [
  { accent: 'from-sky-600/80 to-indigo-800/90' },
  { accent: 'from-violet-600/80 to-purple-800/90' },
  { accent: 'from-rose-600/80 to-red-800/90' },
  { accent: 'from-emerald-600/80 to-teal-800/90' },
  { accent: 'from-amber-500/80 to-orange-700/90' },
];

const prettifyText = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getInitials = (value) => {
  const parts = prettifyText(value).split(' ').filter(Boolean);
  if (parts.length === 0) return 'GM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getPlayerId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user?._id || user?.id || '').trim();
  } catch {
    return '';
  }
};

const GamesHub = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingCode, setLaunchingCode] = useState('');

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/games`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data)) {
        setGames(json.data);
      } else {
        setGames([]);
        setError(json.message || t('games_loadError'));
      }
    } catch {
      setGames([]);
      setError(t('games_loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const launchGame = async (game) => {
    const gameCode = String(game?.gameCode || '').trim().toUpperCase();
    const externalPlayerId = getPlayerId();

    if (!gameCode) {
      setError(t('games_launchError'));
      return;
    }
    if (!externalPlayerId) {
      setError(t('games_err_loginPlayer'));
      return;
    }

    try {
      setError('');
      setLaunchingCode(gameCode);

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
      if (res.status === 401) return;
      const data = await res.json().catch(() => ({}));

      const launchUrl =
        data?.launchUrl ||
        data?.data?.launchUrl ||
        data?.data?.data?.launchUrl ||
        data?.data?.url ||
        data?.data?.gameUrl ||
        data?.data?.sessionUrl ||
        data?.data?.redirectUrl ||
        '';

      if (launchUrl) {
        const codeForRoute = encodeURIComponent(gameCode);
        const gameName = getGameDisplayName(t, game) || gameCode;
        const embedAllowed = data?.embedAllowed !== false;
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
      } else {
        setError(data?.message || t('games_launchNoUrl'));
      }
    } catch {
      setError(t('games_launchError'));
    } finally {
      setLaunchingCode('');
    }
  };

  return (
    <div className="min-h-screen bg-[#1f2937] px-3 sm:px-4 pt-2 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] text-white md:pb-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-white">{t('games_hub_title')}</h1>
          <p className="mt-0.5 text-xs text-[#AAB3C5]">{t('games_hub_subtitle')}</p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, idx) => (
              <div
                key={`sk-${idx}`}
                className="animate-pulse overflow-hidden rounded-2xl border border-[#374151] bg-[#111827]"
              >
                <div className="h-24 bg-[#1f2937]" />
                <div className="px-2 py-2">
                  <div className="h-3 w-2/5 rounded bg-[#374151]" />
                  <div className="mt-1.5 h-2.5 w-1/4 rounded bg-[#374151]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="rounded-2xl border border-[#374151] bg-[#111827] px-4 py-6 text-center text-sm text-[#AAB3C5]">
            {t('games_hub_empty')}
          </div>
        )}

        {!loading && !error && games.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {games.map((game, index) => {
              const theme = CARD_THEMES[index % CARD_THEMES.length];
              const title = getGameDisplayName(t, game);
              const code = String(game?.gameCode || '').trim().toUpperCase();
              return (
                <div
                  key={game?._id || code || `g-${index}`}
                  className="group w-full overflow-hidden rounded-2xl border border-[#374151] bg-[#111827] transition hover:border-[#1a74e5]/50"
                >
                  <button
                    type="button"
                    onClick={() => launchGame(game)}
                    disabled={launchingCode === code}
                    className={`relative block w-full overflow-hidden rounded-2xl text-left ${
                      launchingCode === code ? 'cursor-wait opacity-70' : 'cursor-pointer'
                    }`}
                  >
                    {game?.image ? (
                      <img
                        src={game.image}
                        alt=""
                        className="h-24 w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className={`flex h-24 items-center justify-center bg-gradient-to-br ${theme.accent} text-2xl font-bold text-white/95`}
                      >
                        {getInitials(title)}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent px-2 py-2">
                      <div className="truncate text-sm font-semibold text-white">
                        {launchingCode === code ? t('games_hub_launching') : title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#AAB3C5]">{t('games_hub_tapExplore')}</div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesHub;
