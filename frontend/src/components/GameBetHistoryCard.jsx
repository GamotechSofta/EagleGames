import React, { useState } from 'react';

const NAVY = '#1B3150';

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const date = d.toLocaleDateString('en-GB').replace(/\//g, '-');
    const time = d
      .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(/\s/g, ' ')
      .toLowerCase();
    return `${date} ${time}`;
  } catch {
    return '-';
  }
};

const formatAmount = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

const shortBetId = (id) => {
  const s = (id ?? '').toString();
  if (!s) return '—';
  return s.length <= 10 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
};

const CopyIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DetailRow = ({ label, value, valueClassName = '' }) => (
  <div className="flex items-center justify-between gap-2 text-[10px] leading-snug">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`text-gray-900 font-semibold text-right truncate min-w-0 tabular-nums ${valueClassName}`}>
      {value}
    </span>
  </div>
);

const GameBetHistoryCard = ({ entry, index, username = '' }) => {
  const won = entry.status === 'won' || (Number(entry.payout) || 0) > 0;
  const betAmount = Number(entry.betAmount) || 0;
  const payout = Number(entry.payout) || 0;
  const betId = String(entry.betId || entry.roundId || entry.id || '-').replace(/^partner-/, '');
  const gameTitle = String(entry.gameName || entry.gameCode || 'Game').toUpperCase();
  const gameLabel = entry.gameName || entry.gameCode || 'Game';
  const [copied, setCopied] = useState(false);

  const copyBetId = async () => {
    try {
      await navigator.clipboard.writeText(betId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const statusBadgeClass = won
    ? 'text-green-800 border-green-500 bg-green-100'
    : 'text-red-800 border-red-500 bg-red-100';

  const cardShellClass = won
    ? 'bg-gradient-to-b from-green-50 to-emerald-50/90 border-green-500/50 shadow-[0_2px_10px_rgba(22,163,74,0.12)] hover:border-green-600/70 hover:shadow-[0_4px_14px_rgba(22,163,74,0.16)]'
    : 'bg-gradient-to-b from-red-50 to-rose-50/90 border-red-500/50 shadow-[0_2px_10px_rgba(220,38,38,0.12)] hover:border-red-600/70 hover:shadow-[0_4px_14px_rgba(220,38,38,0.16)]';

  return (
    <div
      className={`rounded-xl border-2 p-2.5 flex flex-col gap-2 min-w-0 transition-[box-shadow,border-color] duration-200 ${cardShellClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-gray-500">#{index}</span>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wide ${statusBadgeClass}`}
        >
          {won ? 'Won' : 'Lost'}
        </span>
      </div>

      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">User</span>
          <span className="font-semibold text-gray-900 truncate max-w-[58%]">{username || '—'}</span>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <span className="text-gray-500 shrink-0">Bet ID</span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-mono text-[9px] text-gray-800 truncate max-w-[76px]" title={betId}>
              {shortBetId(betId)}
            </span>
            <button
              type="button"
              onClick={copyBetId}
              className="shrink-0 p-0.5 rounded-md text-gray-500 hover:text-[#1a74e5] hover:bg-white/70 transition-colors"
              aria-label="Copy bet ID"
              title={copied ? 'Copied' : 'Copy'}
            >
              <CopyIcon />
            </button>
          </div>
        </div>
      </div>

      <h3
        className="text-center text-[11px] font-extrabold tracking-wide uppercase leading-tight truncate px-1"
        style={{ color: NAVY }}
        title={gameTitle}
      >
        {gameTitle}
      </h3>

      <div className="space-y-1 rounded-lg bg-white/55 border border-white/80 px-2 py-1.5">
        <DetailRow label="Game" value={gameLabel} />
        <DetailRow label="Bet" value={shortBetId(betId)} />
        <DetailRow label="Bet amount" value={`₹${formatAmount(betAmount)}`} />
        <DetailRow
          label="Cash out"
          value={`₹${formatAmount(payout)}`}
          valueClassName={won ? 'text-green-700' : 'text-gray-600'}
        />
      </div>

      <p className="text-center text-[9px] text-gray-500 leading-tight border-t border-black/5 pt-1.5">
        {formatTime(entry.createdAt)}
      </p>
    </div>
  );
};

export default GameBetHistoryCard;
