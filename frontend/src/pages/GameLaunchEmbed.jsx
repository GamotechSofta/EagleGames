import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  GAME_LAUNCH_URL_KEY_PREFIX,
  GAME_LAUNCH_NAME_KEY_PREFIX,
  GAME_LAUNCH_EMBED_KEY_PREFIX,
} from '../components/GamesSection';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const GameLaunchEmbed = () => {
  const { gameCode: gameCodeParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [launchUrl, setLaunchUrl] = useState('');
  const [gameName, setGameName] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [openedExternal, setOpenedExternal] = useState(false);
  const externalOpenedRef = useRef(false);

  const gameCode = useMemo(() => {
    try {
      return decodeURIComponent(gameCodeParam || '');
    } catch {
      return gameCodeParam || '';
    }
  }, [gameCodeParam]);

  const openExternalOnce = (url) => {
    if (!url || externalOpenedRef.current) return;
    externalOpenedRef.current = true;
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpenedExternal(true);
    setReady(true);
  };

  useEffect(() => {
    let cancelled = false;

    const scrubHistoryState = () => {
      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch (_) {}
    };

    const run = async () => {
      const fromNav = location.state?.launchUrl;
      const nameFromNav = location.state?.gameName;
      const embedFromNav = location.state?.embedAllowed;

      if (fromNav) {
        if (embedFromNav === false) {
          openExternalOnce(fromNav);
          if (nameFromNav) setGameName(nameFromNav);
          scrubHistoryState();
          return;
        }
        if (!cancelled) {
          setLaunchUrl(fromNav);
          if (nameFromNav) setGameName(nameFromNav);
          scrubHistoryState();
          setReady(true);
        }
        return;
      }

      let storedUrl = '';
      let storedName = '';
      let embedStored = '1';
      try {
        storedUrl = sessionStorage.getItem(`${GAME_LAUNCH_URL_KEY_PREFIX}${gameCode}`) || '';
        storedName = sessionStorage.getItem(`${GAME_LAUNCH_NAME_KEY_PREFIX}${gameCode}`) || '';
        embedStored =
          sessionStorage.getItem(`${GAME_LAUNCH_EMBED_KEY_PREFIX}${gameCode}`) ?? '1';
      } catch (_) {}

      if (storedUrl) {
        if (embedStored === '0') {
          openExternalOnce(storedUrl);
          if (storedName) setGameName(storedName);
          scrubHistoryState();
          return;
        }
        if (!cancelled) {
          setLaunchUrl(storedUrl);
          if (storedName) setGameName(storedName);
          scrubHistoryState();
          setReady(true);
        }
        return;
      }

      if (!gameCode) {
        if (!cancelled) {
          setError(t('games_launchError'));
          setReady(true);
        }
        return;
      }

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
        if (cancelled) return;
        if (res.ok && json.success && json.launchUrl) {
          const embedAllowed = json.embedAllowed !== false;
          try {
            sessionStorage.setItem(`${GAME_LAUNCH_EMBED_KEY_PREFIX}${gameCode}`, embedAllowed ? '1' : '0');
          } catch (_) {}
          if (!embedAllowed) {
            openExternalOnce(json.launchUrl);
            scrubHistoryState();
            return;
          }
          setLaunchUrl(json.launchUrl);
          try {
            sessionStorage.setItem(`${GAME_LAUNCH_URL_KEY_PREFIX}${gameCode}`, json.launchUrl);
          } catch (_) {}
          scrubHistoryState();
        } else {
          setError(json.message || t('games_launchError'));
        }
      } catch {
        if (!cancelled) setError(t('games_launchError'));
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve launch URL when gameCode / mount changes
  }, [gameCode]);

  const iframeProps = useMemo(
    () => ({
      title: gameName || 'Game',
      src: launchUrl || undefined,
      className: 'min-h-0 w-full flex-1 border-0 bg-black',
      allow: 'fullscreen; autoplay; camera; microphone; payment; clipboard-write',
      referrerPolicy: 'no-referrer',
    }),
    [launchUrl, gameName]
  );

  if (!ready && !error && !openedExternal) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-black text-[#AAB3C5] text-sm">
        {t('games_loading')}
      </div>
    );
  }

  if (openedExternal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white px-4 gap-4">
        <p className="text-center text-sm text-[#AAB3C5] max-w-sm">{t('games_openedNewTab')}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-[#1a74e5] px-4 py-2 text-sm font-semibold"
        >
          {t('games_back')}
        </button>
      </div>
    );
  }

  if (error || !launchUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white px-4 gap-4">
        <p className="text-center text-sm text-red-400">{error || t('games_launchError')}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-[#1a74e5] px-4 py-2 text-sm font-semibold"
        >
          {t('games_back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] max-h-[100dvh] bg-black overflow-hidden">
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#111827]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-white text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/10"
          aria-label={t('games_back')}
        >
          ← {t('games_back')}
        </button>
        <h1 className="text-white text-sm font-semibold truncate flex-1">{gameName || gameCode}</h1>
      </header>
      <iframe {...iframeProps} />
    </div>
  );
};

export default GameLaunchEmbed;
