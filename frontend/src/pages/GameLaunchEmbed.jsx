import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import { partnerRequiresTopLevelNavigation } from '../utils/partnerGameEmbed';

/** Session keys for handoff from `POST /api/v1/games/launch/:gameCode` to `/games/play/:gameCode`. */
function gameLaunchSessionKeys(gameCode) {
  const c = String(gameCode || '').trim().toUpperCase();
  return {
    url: `eagleGames:v1:gameLaunch:url:${c}`,
    name: `eagleGames:v1:gameLaunch:name:${c}`,
    embed: `eagleGames:v1:gameLaunch:embed:${c}`,
  };
}

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
  /** When false, partner URL must open at top level (not iframe); we redirect with location.assign. */
  const [useIframe, setUseIframe] = useState(true);
  const topLevelRedirectRef = useRef(false);

  const clearStoredLaunch = () => {
    try {
      const k = gameLaunchSessionKeys(gameCode);
      sessionStorage.removeItem(k.url);
      sessionStorage.removeItem(k.name);
      sessionStorage.removeItem(k.embed);
    } catch (_) {}
  };

  const handleBack = () => {
    clearStoredLaunch();
    navigate('/games', { replace: true });
  };

  const openGameInNewTab = () => {
    if (!launchUrl) return;
    window.open(launchUrl.trim(), '_blank', 'noopener,noreferrer');
  };

  const applyLaunchPayload = (url, name, embedAllowedFromApi, cancelled) => {
    if (cancelled || !isHttpUrl(url)) return;
    const trimmed = url.trim();
    setLaunchUrl(trimmed);
    if (typeof name === 'string' && name.trim()) setGameName(name.trim());

    let partnerAllowsEmbed = true;
    if (typeof embedAllowedFromApi === 'boolean') {
      partnerAllowsEmbed = embedAllowedFromApi;
    } else {
      try {
        const st = sessionStorage.getItem(gameLaunchSessionKeys(gameCode).embed);
        if (st === '0') partnerAllowsEmbed = false;
      } catch (_) {}
    }

    const needsTopLevel = partnerRequiresTopLevelNavigation(trimmed, gameCode, partnerAllowsEmbed);
    const iframe = !needsTopLevel;
    setUseIframe(iframe);

    try {
      const k = gameLaunchSessionKeys(gameCode);
      sessionStorage.setItem(k.url, trimmed);
      if (typeof name === 'string' && name.trim()) {
        sessionStorage.setItem(k.name, name.trim());
      }
      sessionStorage.setItem(k.embed, iframe ? '1' : '0');
    } catch (_) {}
  };

  useEffect(() => {
    let cancelled = false;

    const resolveOnce = async () => {
      let resolvedUrl = '';
      let resolvedName = '';
      let resolvedEmbedAllowed;

      const stateUrl = location.state?.launchUrl;
      const stateName = location.state?.gameName;
      const stateEmb = location.state?.embedAllowed;
      if (isHttpUrl(stateUrl)) resolvedUrl = stateUrl.trim();
      if (typeof stateName === 'string' && stateName.trim()) resolvedName = stateName.trim();
      if (typeof stateEmb === 'boolean') resolvedEmbedAllowed = stateEmb;

      try {
        if (!resolvedUrl) {
          const stored = sessionStorage.getItem(gameLaunchSessionKeys(gameCode).url);
          if (isHttpUrl(stored)) resolvedUrl = stored.trim();
        }
        if (!resolvedName) {
          const storedName = sessionStorage.getItem(gameLaunchSessionKeys(gameCode).name);
          if (typeof storedName === 'string' && storedName.trim()) resolvedName = storedName.trim();
        }
      } catch (_) {}

      if (resolvedUrl && gameCode) {
        if (cancelled) return;
        applyLaunchPayload(resolvedUrl, resolvedName, resolvedEmbedAllowed, cancelled);
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
          const emb = data?.embedAllowed !== false;
          applyLaunchPayload(url, data?.gameName || resolvedName || gameCode, emb, cancelled);
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

  /** Roulette and some partners block iframes; same launch URL works as a full-page navigation. */
  useEffect(() => {
    if (phase !== 'ready' || !launchUrl || useIframe) return;
    if (topLevelRedirectRef.current) return;
    topLevelRedirectRef.current = true;
    window.location.assign(launchUrl.trim());
  }, [phase, launchUrl, useIframe]);

  const iframeProps = useMemo(
    () => ({
      title: gameName || 'Game',
      src: launchUrl,
      className: 'min-h-0 w-full flex-1 border-0 bg-black',
      allow: 'fullscreen; autoplay; camera; microphone; payment; clipboard-write',
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

  if (!useIframe && launchUrl) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-sm text-white/80">
        <p>{t('games_loading')}</p>
        <p className="max-w-md text-xs text-[#AAB3C5]">{t('games_iframeBlockedHint')}</p>
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
        <button
          type="button"
          onClick={openGameInNewTab}
          className="ml-auto shrink-0 rounded-lg border border-[#1a74e5]/60 bg-[#1a74e5]/20 px-3 py-1.5 text-xs font-semibold text-[#cbe0ff] hover:bg-[#1a74e5]/30"
        >
          {t('games_openNewTab')}
        </button>
      </div>
      <iframe {...iframeProps} />
    </div>
  );
};

export default GameLaunchEmbed;
