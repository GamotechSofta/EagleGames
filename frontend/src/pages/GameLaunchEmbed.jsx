import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { requestGameLaunch } from '../api/games';
import { clearStoredLaunch, readStoredLaunch } from '../utils/gameLaunchFlow';
import { partnerRequiresTopLevelNavigation } from '../utils/partnerGameEmbed';

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

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
  const [phase, setPhase] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [useIframe, setUseIframe] = useState(true);
  const topLevelRedirectRef = useRef(false);

  const handleBack = () => {
    clearStoredLaunch(gameCode);
    navigate('/games', { replace: true });
  };

  const applyLaunchPayload = (url, name, embedAllowedFromApi) => {
    if (!isHttpUrl(url)) return;
    const trimmed = url.trim();
    setLaunchUrl(trimmed);
    if (typeof name === 'string' && name.trim()) setGameName(name.trim());

    let partnerAllowsEmbed = true;
    if (typeof embedAllowedFromApi === 'boolean') {
      partnerAllowsEmbed = embedAllowedFromApi;
    } else {
      const stored = readStoredLaunch(gameCode);
      partnerAllowsEmbed = stored.embedAllowed;
    }

    const needsTopLevel = partnerRequiresTopLevelNavigation(trimmed, gameCode, partnerAllowsEmbed);
    setUseIframe(!needsTopLevel);
  };

  useEffect(() => {
    let cancelled = false;

    const resolveOnce = async () => {
      const stateUrl = location.state?.launchUrl;
      const stateName = location.state?.gameName;
      const stateEmb = location.state?.embedAllowed;

      if (isHttpUrl(stateUrl)) {
        if (cancelled) return;
        applyLaunchPayload(stateUrl, stateName, stateEmb);
        try {
          window.history.replaceState({}, '', `/games/play/${encodeURIComponent(gameCode)}`);
        } catch (_) {}
        setPhase('ready');
        return;
      }

      const stored = readStoredLaunch(gameCode);
      if (isHttpUrl(stored.launchUrl)) {
        if (cancelled) return;
        applyLaunchPayload(stored.launchUrl, stored.gameName, stored.embedAllowed);
        setPhase('ready');
        return;
      }

      if (!gameCode) {
        if (!cancelled) navigate('/games', { replace: true });
        return;
      }

      const result = await requestGameLaunch(gameCode);
      if (cancelled) return;

      if (!result.ok) {
        setErrorMessage(result.errorMessage || t('games_launchError'));
        setPhase('error');
        return;
      }

      const playUrl = result.playableUrl || result.launchUrl;
      applyLaunchPayload(playUrl, result.data?.gameName || gameCode, result.embedAllowed);
      try {
        window.history.replaceState({}, '', `/games/play/${encodeURIComponent(gameCode)}`);
      } catch (_) {}
      setPhase('ready');
    };

    resolveOnce();
    return () => {
      cancelled = true;
    };
  }, [gameCode, location.state, navigate, t]);

  useEffect(() => {
    if (phase !== 'ready' || !launchUrl || useIframe) return;
    const partnerUrl = location.state?.partnerLaunchUrl;
    if (location.state?.useEmbedProxy) return;
    if (topLevelRedirectRef.current) return;
    topLevelRedirectRef.current = true;
    window.location.assign(String(partnerUrl || launchUrl).trim());
  }, [phase, launchUrl, useIframe, location.state]);

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
        <p>{errorMessage || t('games_launchError')}</p>
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
