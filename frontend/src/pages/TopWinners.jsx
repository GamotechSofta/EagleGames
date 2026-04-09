import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const INR = (n) => {
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('en-IN');
};

const timeRanges = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'all', label: 'All' },
];

const medalBg = (rank) => {
  if (rank === 1) return 'from-[#d4af37] via-[#cca84d] to-[#b8941f]';
  if (rank === 2) return 'from-[#cbd5e1] via-[#94a3b8] to-[#64748b]';
  if (rank === 3) return 'from-[#f59e0b] via-[#d97706] to-[#92400e]';
  return 'from-[#2a2d32] via-[#1f2227] to-[#15171b]';
};

const TopWinners = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const title = 'Top Winners';

  const fetchWinners = async (range) => {
    setLoading(true);
    setError('');
    try {
      const qs = range && range !== 'all' ? `?timeRange=${encodeURIComponent(range)}` : '';
      const res = await fetch(`${API_BASE_URL}/bets/public/top-winners${qs}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load top winners');
      }
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || 'Failed to load top winners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners(timeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const normalized = useMemo(() => {
    return (rows || []).map((r, idx) => {
      const username = r?.userId?.username || r?.user?.username || 'User';
      const totalWinnings = Number(r?.totalWinnings ?? 0) || 0;
      const totalWins = Number(r?.totalWins ?? 0) || 0;
      const winRate = r?.winRate != null ? String(r.winRate) : '';
      return {
        rank: idx + 1,
        username,
        totalWinnings,
        totalWins,
        winRate,
      };
    });
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#111827] text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-3 pt-4 pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#1f2937] border border-[#374151] flex items-center justify-center text-white hover:bg-[#374151] active:scale-95 transition touch-manipulation"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {timeRanges.map((t) => {
            const active = t.key === timeRange;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeRange(t.key)}
                className={`h-9 px-4 rounded-full border text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#1a74e5] text-white border-[#1a74e5]'
                    : 'bg-[#111827] text-gray-200 border-[#374151] hover:border-[#374151] hover:bg-[#1f2937]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[76px] rounded-2xl bg-[#1f2937] border border-[#374151] animate-pulse" />
            ))}
          </div>
        ) : normalized.length === 0 ? (
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 text-center text-gray-300 text-sm">
            No winners found.
          </div>
        ) : (
          <div className="space-y-3">
            {normalized.map((r) => (
              <div
                key={`${r.rank}-${r.username}`}
                className="bg-[#111827] border border-[#374151] rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${medalBg(r.rank)} text-black flex items-center justify-center font-extrabold shadow-[0_10px_20px_rgba(0,0,0,0.35)] shrink-0`}
                  aria-label={`Rank ${r.rank}`}
                >
                  {r.rank}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-bold truncate">{r.username}</div>
                    <div className="text-[#1a74e5] font-extrabold shrink-0">₹ {INR(r.totalWinnings)}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-300">
                    <span className="shrink-0">Wins: {INR(r.totalWins)}</span>
                    {r.winRate ? <span className="shrink-0">Win rate: {r.winRate}%</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopWinners;

