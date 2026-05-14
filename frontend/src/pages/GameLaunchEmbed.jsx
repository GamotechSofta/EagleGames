import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  GAME_LAUNCH_URL_KEY_PREFIX,
  GAME_LAUNCH_NAME_KEY_PREFIX,
} from '../constants/gamesLaunchStorage';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const storageKeyForCode = (code) =>
  `${GAME_LAUNCH_URL_KEY_PREFIX}${String(code || '').trim().toUpperCase()}`;
const nameKeyForCode = (code) =>
  `${GAME_LAUNCH_NAME_KEY_PREFIX}${String(code || '').trim().toUpperCase()}`;

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const getPlayerId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user?._id || user?.id || '').trim();
  } catch {
    return '';
  }
};

const GameLaunchEmbed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameCode: rawParam } = useParams();
  const { t } = useLanguage();
  const gameCode = useMemo(() => {
    try {
      return decodeURIComponent(rawParam || '').trim().toUpperCase();
    } catch {
      return String(rawParam || '').trim().toUpperCase();
    }
  }, [rawParam]);

  const [launchUrl, setLaunchUrl] = useState('');
  const [gameName, setGameName] = useState('Game');
  const [phase, setPhase] = useState('loading'); // loading | ready | error

  const clearStoredLaunch = () => {
    try {
      sessionStorage.removeItem(storageKeyForCode(gameCode));
      sessionStorage.removeItem(nameKeyForCode(gameCode));
    } catch (_) {}
  };

  const handleBack = () => {
    clearStoredLaunch();
    navigate('/games', { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const resolveOnce = async () => {
      let resolvedUrl = '';
      let resolvedName = '';

      const stateUrl = location.state?.launchUrl;
      const stateName = location.state?.gameName;
      if (isHttpUrl(stateUrl)) resolvedUrl = stateUrl.trim();
      if (typeof stateName === 'string' && stateName.trim()) resolvedName = stateName.trim();

      try {
        if (!resolvedUrl) {
          const stored = sessionStorage.getItem(storageKeyForCode(gameCode));
          if (isHttpUrl(stored)) resolvedUrl = stored.trim();
        }
        if (!resolvedName) {
          const storedName = sessionStorage.getItem(nameKeyForCode(gameCode));
          if (typeof storedName === 'string' && storedName.trim()) resolvedName = storedName.trim();
        }
      } catch (_) {}

      if (resolvedUrl && gameCode) {
        if (cancelled) return;
        setLaunchUrl(resolvedUrl);
        if (resolvedName) setGameName(resolvedName);
        try {
          sessionStorage.setItem(storageKeyForCode(gameCode), resolvedUrl);
          if (resolvedName) sessionStorage.setItem(nameKeyForCode(gameCode), resolvedName);
        } catch (_) {}
        if (location.state) {
          try {
            window.history.replaceState({}, '', `/games/play/${encodeURIComponent(gameCode)}`);
          } catch (_) {}
        }
        setPhase('ready');
        return;
      }

      if (!gameCode) {
        if (!cancelled) navigate('/games', { replace: true });
        return;
      }

      const externalPlayerId = getPlayerId();
      if (!externalPlayerId) {
        if (!cancelled) navigate('/games', { replace: true });
        return;
      }

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
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const url =
          data?.launchUrl ||
          data?.data?.launchUrl ||
          data?.data?.data?.launchUrl ||
          data?.data?.url ||
          data?.data?.gameUrl ||
          data?.data?.sessionUrl ||
          data?.data?.redirectUrl ||
          '';
        if (res.ok && isHttpUrl(url) && data?.success !== false) {
          setLaunchUrl(url.trim());
          const n = typeof data?.gameName === 'string' ? data.gameName : resolvedName || gameCode;
          setGameName(n);
          try {
            sessionStorage.setItem(storageKeyForCode(gameCode), url.trim());
            sessionStorage.setItem(nameKeyForCode(gameCode), String(n));
          } catch (_) {}
          try {
            window.history.replaceState({}, '', `/games/play/${encodeURIComponent(gameCode)}`);
          } catch (_) {}
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    };

    resolveOnce();
    return () => {
      cancelled = true;
    };
  }, [gameCode, location.state, navigate]);

  const iframeProps = useMemo(
    () => ({
      title: gameName || 'Game',
      src: launchUrl,
      className: 'min-h-0 w-full flex-1 border-0 bg-black',
      allow: 'fullscreen; autoplay; camera; microphone; payment; clipboard-write',
      referrerPolicy: 'no-referrer',
    }),
    [launchUrl, gameName]
  );

  if (phase === 'loading' || (phase === 'ready' && !launchUrl)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 text-sm text-white/80">
        {t('games_loading')}
      </div>
    );
  }

  if (phase === 'error' || !launchUrl) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-sm text-red-300">
        <p>{t('games_launchError')}</p>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-lg bg-[#1a74e5] px-4 py-2 text-sm font-semibold text-white"
        >
          {t('games_backHub')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#111827] px-2">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          ← {t('games_back')}
        </button>
        <div className="ml-2 truncate text-sm font-semibold text-white">{gameName}</div>
      </div>
      <iframe {...iframeProps} />
    </div>
  );
};

export default GameLaunchEmbed;
