import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders, clearAdminSession, fetchWithAuth } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';
import {
    FaGamepad,
    FaFilter,
    FaRedo,
    FaChevronLeft,
    FaChevronRight,
    FaTrophy,
    FaTimes,
} from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
const LIMIT = 50;

const GAME_TABS = [
    { key: 'all', labelKey: 'gh_tabAll' },
    { key: 'AVIATOR', label: 'Aviator' },
    { key: 'FUNTIMER', label: 'Fun Timer' },
    { key: 'ROULETTE', label: 'Roulette' },
];

const formatTime = (iso) => {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '—';
    }
};

const formatNum = (n) =>
    Number.isFinite(Number(n))
        ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
        : '0';

const formatCurrency = (n) => `₹${formatNum(n)}`;

const emptyFilters = () => ({ userId: '', status: '', startDate: '', endDate: '' });

const SkeletonRow = () => (
    <tr className="animate-pulse">
        {[...Array(8)].map((_, i) => (
            <td key={i} className="px-3 py-3">
                <div className="h-4 bg-gray-200 rounded w-full max-w-[80px]" />
            </td>
        ))}
    </tr>
);

const StatusBadge = ({ won, pending, t }) => {
    if (pending) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {t('gh_pending')}
            </span>
        );
    }
    if (won) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <FaTrophy className="w-3 h-3" />
                {t('gh_won')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <FaTimes className="w-3 h-3" />
            {t('gh_lost')}
        </span>
    );
};

const HistoryCard = ({ entry, index, page, t }) => {
    const betAmount = Number(entry.betAmount) || 0;
    const payout = Number(entry.payout) || 0;
    const houseProfit = betAmount - payout;
    const playerProfit = payout - betAmount;
    const pending = entry.status === 'pending';
    const won = !pending && (entry.status === 'won' || payout > 0);
    const player = entry.user;
    const playerName = player?.username || player?.phone || '—';

    return (
        <div
            className={`rounded-xl border p-4 shadow-sm ${
                pending
                    ? 'bg-amber-50/50 border-amber-200'
                    : won
                      ? 'bg-white border-gray-200'
                      : 'bg-white border-gray-200'
            }`}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <p className="text-xs text-gray-500 font-medium">#{(page - 1) * LIMIT + index + 1}</p>
                    <p className="font-semibold text-gray-900">{playerName}</p>
                    <p className="text-xs text-orange-600 font-medium mt-0.5">
                        {entry.gameName || entry.gameCode || '—'}
                    </p>
                </div>
                <StatusBadge won={won} pending={pending} t={t} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">{t('gh_colWagered')}</p>
                    <p className="font-mono font-semibold text-gray-900">{formatCurrency(betAmount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">{t('gh_colPayout')}</p>
                    <p className="font-mono font-semibold text-gray-900">{formatCurrency(payout)}</p>
                </div>
                <div
                    className={`rounded-lg px-3 py-2 col-span-2 ${
                        houseProfit >= 0 ? 'bg-blue-50 border border-blue-100' : 'bg-red-50 border border-red-100'
                    }`}
                >
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">{t('gh_colHouse')}</p>
                    <p
                        className={`font-mono font-bold ${
                            houseProfit >= 0 ? 'text-blue-700' : 'text-red-700'
                        }`}
                    >
                        {houseProfit >= 0 ? '+' : ''}
                        {formatCurrency(houseProfit)}
                        <span className="text-xs font-normal text-gray-500 ml-2">
                            ({t('gh_colPlayerPl')}: {playerProfit >= 0 ? '+' : ''}
                            {formatCurrency(playerProfit)})
                        </span>
                    </p>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{formatTime(entry.createdAt)}</p>
        </div>
    );
};

const GameHistory = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [activeGame, setActiveGame] = useState('all');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

    const fetchEntries = useCallback(
        async (pg = 1, f = appliedFilters, gameKey = activeGame) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ limit: LIMIT, page: pg });
                if (f.userId) params.append('userId', f.userId.trim());
                if (f.status) params.append('status', f.status);
                if (f.startDate) params.append('startDate', f.startDate);
                if (f.endDate) params.append('endDate', f.endDate);
                if (gameKey && gameKey !== 'all') params.append('gameCode', gameKey);

                const res = await fetchWithAuth(`${API_BASE_URL}/games/admin-bet-history?${params}`, {
                    headers: getAuthHeaders(),
                });
                if (res.status === 401) {
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                if (data?.success) {
                    setEntries(Array.isArray(data.data) ? data.data : []);
                    setTotal(data.total ?? 0);
                } else {
                    setEntries([]);
                    setTotal(0);
                }
            } catch {
                setEntries([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        },
        [appliedFilters, activeGame]
    );

    useEffect(() => {
        fetchEntries(page, appliedFilters, activeGame);
    }, [activeGame, page, appliedFilters, fetchEntries]);

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const handleResetFilters = () => {
        const empty = emptyFilters();
        setFilters(empty);
        setAppliedFilters(empty);
        setPage(1);
    };

    const handleLogout = () => {
        clearAdminSession();
        navigate('/');
    };

    const summary = useMemo(() => {
        const totalWagered = entries.reduce((s, g) => s + (Number(g.betAmount) || 0), 0);
        const totalPayout = entries.reduce((s, g) => s + (Number(g.payout) || 0), 0);
        const houseProfit = totalWagered - totalPayout;
        const wins = entries.filter((e) => e.status === 'won' || (Number(e.payout) || 0) > 0).length;
        const winRate = entries.length ? Math.round((wins / entries.length) * 100) : 0;
        return { totalWagered, totalPayout, houseProfit, wins, losses: entries.length - wins, winRate };
    }, [entries]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const tabLabel = (tab) => (tab.labelKey ? t(tab.labelKey) : tab.label);

    return (
        <AdminLayout onLogout={handleLogout} title={t('gh_title')}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                        <FaGamepad className="w-5 h-5 text-orange-500" />
                    </span>
                    {t('gh_title')}
                </h1>
                <p className="text-gray-500 text-sm mt-2 max-w-2xl">{t('gh_subtitle')}</p>
            </div>

            {/* Game tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-thin">
                {GAME_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                            setActiveGame(tab.key);
                            setPage(1);
                        }}
                        className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-full border transition-all ${
                            activeGame === tab.key
                                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                        }`}
                    >
                        {tabLabel(tab)}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-800">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('gh_filterPlayer')}</label>
                        <input
                            type="text"
                            placeholder="MongoDB user ID"
                            value={filters.userId}
                            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('gh_filterStatus')}</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 outline-none"
                        >
                            <option value="">All results</option>
                            <option value="won">{t('gh_won')}</option>
                            <option value="lost">{t('gh_lost')}</option>
                            <option value="pending">{t('gh_pending')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('gh_filterFrom')}</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('gh_filterTo')}</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 outline-none"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors"
                    >
                        {t('gh_apply')}
                    </button>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                        {t('gh_reset')}
                    </button>
                    <button
                        type="button"
                        onClick={() => fetchEntries(page, appliedFilters, activeGame)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-orange-600 text-sm font-medium"
                    >
                        <FaRedo className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary */}
            {!loading && entries.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                    {[
                        {
                            label: t('gh_totalBets'),
                            value: entries.length,
                            sub: t('gh_records', { count: total }),
                            className: 'bg-slate-50 border-slate-200 text-slate-800',
                        },
                        {
                            label: t('gh_wagered'),
                            value: formatCurrency(summary.totalWagered),
                            className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                        },
                        {
                            label: t('gh_paidOut'),
                            value: formatCurrency(summary.totalPayout),
                            className: 'bg-red-50 border-red-200 text-red-800',
                        },
                        {
                            label: t('gh_houseProfit'),
                            value: `${summary.houseProfit >= 0 ? '+' : ''}${formatCurrency(summary.houseProfit)}`,
                            className:
                                summary.houseProfit >= 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : 'bg-red-50 border-red-200 text-red-800',
                        },
                        {
                            label: t('gh_winRate'),
                            value: `${summary.winRate}%`,
                            sub: `${summary.wins}W / ${summary.losses}L`,
                            className: 'bg-orange-50 border-orange-200 text-orange-800',
                        },
                    ].map((c) => (
                        <div key={c.label} className={`rounded-xl border p-3 sm:p-4 ${c.className}`}>
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide opacity-80">
                                {c.label}
                            </p>
                            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate">{c.value}</p>
                            {c.sub && <p className="text-[10px] mt-0.5 opacity-70">{c.sub}</p>}
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm hidden md:table">
                        <thead className="bg-gray-50">
                            <tr>
                                {[...Array(8)].map((_, i) => (
                                    <th key={i} className="px-3 py-3" />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(6)].map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </tbody>
                    </table>
                    <div className="md:hidden p-4 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            ) : entries.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <FaGamepad className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">{t('gh_empty')}</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-3 text-left font-semibold text-gray-600">#</th>
                                    <th className="px-3 py-3 text-left font-semibold text-gray-600">{t('gh_colPlayer')}</th>
                                    <th className="px-3 py-3 text-left font-semibold text-gray-600">{t('gh_colGame')}</th>
                                    <th className="px-3 py-3 text-center font-semibold text-gray-600">{t('gh_colBet')}</th>
                                    <th className="px-3 py-3 text-right font-semibold text-gray-600">{t('gh_colWagered')}</th>
                                    <th className="px-3 py-3 text-right font-semibold text-gray-600">{t('gh_colPayout')}</th>
                                    <th className="px-3 py-3 text-right font-semibold text-gray-600">{t('gh_colHouse')}</th>
                                    <th className="px-3 py-3 text-center font-semibold text-gray-600">{t('gh_colResult')}</th>
                                    <th className="px-3 py-3 text-left font-semibold text-gray-600">{t('gh_colTime')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {entries.map((entry, i) => {
                                    const betAmount = Number(entry.betAmount) || 0;
                                    const payout = Number(entry.payout) || 0;
                                    const houseProfit = betAmount - payout;
                                    const pending = entry.status === 'pending';
                                    const won = !pending && (entry.status === 'won' || payout > 0);
                                    const player = entry.user;
                                    return (
                                        <tr key={entry.id || i} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="px-3 py-2.5 text-gray-400 text-xs">
                                                {(page - 1) * LIMIT + i + 1}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-medium text-gray-900">
                                                    {player?.username || player?.phone || '—'}
                                                </p>
                                                {player?.email && (
                                                    <p className="text-[10px] text-gray-400 truncate max-w-[140px]">
                                                        {player.email}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-xs font-semibold">
                                                    {entry.gameName || entry.gameCode || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-gray-600 font-mono text-xs">
                                                {entry.winningNumber != null
                                                    ? entry.winningNumber
                                                    : entry.betNumber || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-800">
                                                {formatCurrency(betAmount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-800">
                                                {formatCurrency(payout)}
                                            </td>
                                            <td
                                                className={`px-3 py-2.5 text-right font-mono font-bold ${
                                                    houseProfit >= 0 ? 'text-blue-700' : 'text-red-700'
                                                }`}
                                            >
                                                {houseProfit >= 0 ? '+' : ''}
                                                {formatCurrency(houseProfit)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <StatusBadge won={won} pending={pending} t={t} />
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                                                {formatTime(entry.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {entries.map((entry, i) => (
                            <HistoryCard key={entry.id || i} entry={entry} index={i} page={page} t={t} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-5 flex-wrap gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
                            <span className="text-sm text-gray-600">
                                {t('gh_page', { page, total: totalPages })} · {t('gh_records', { count: total })}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <FaChevronLeft className="w-3 h-3" />
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <FaChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </AdminLayout>
    );
};

export default GameHistory;
