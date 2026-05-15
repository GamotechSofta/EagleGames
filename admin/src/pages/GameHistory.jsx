import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders, clearAdminSession, fetchWithAuth } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const formatTime = (iso) => {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '-'; }
};

const formatNum = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0');

const BET_TYPE_LABEL_MAP = {
    straight: 'Straight',
    split: 'Split',
    corner: 'Corner',
    dozen: 'Dozen',
    column: 'Column',
    red: 'Red',
    black: 'Black',
    odd: 'Odd',
    even: 'Even',
    low: 'Low (1-18)',
    high: 'High (19-36)',
};
const betTypeLabel = (t) => BET_TYPE_LABEL_MAP[(t || '').toLowerCase()] || t || 'Bet';

const GAME_TABS = [
    { key: 'all', label: 'All Games' },
    { key: 'AVIATOR', label: 'Aviator' },
    { key: 'FUNTIMER', label: 'Fun Timer' },
    { key: 'ROULETTE', label: 'Roulette' },
];

const GameHistory = () => {
    const navigate = useNavigate();
    const [activeGame, setActiveGame] = useState('all');

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 50;

    const [filters, setFilters] = useState({
        userId: '',
        status: '', // 'win' | 'lost' | ''
        startDate: '',
        endDate: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(filters);

    const fetchEntries = useCallback(async (pg = 1, f = appliedFilters, gameKey = activeGame) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: LIMIT, page: pg });
            if (f.userId) params.append('userId', f.userId);
            const res = await fetchWithAuth(`${API_BASE_URL}/games/admin-bet-history?${params}`, {
                headers: getAuthHeaders(),
            });
            if (res.status === 401) { setLoading(false); return; }
            const data = await res.json();
            if (data?.success) {
                let list = Array.isArray(data.data) ? data.data : [];
                if (gameKey && gameKey !== 'all') {
                    list = list.filter((e) => String(e.gameCode || '').toUpperCase() === gameKey);
                }
                if (f.status === 'win') list = list.filter((e) => e.status === 'won' || (Number(e.payout) || 0) > 0);
                if (f.status === 'lost') list = list.filter((e) => e.status === 'lost' && (Number(e.payout) || 0) === 0);
                if (f.startDate) {
                    const from = new Date(f.startDate).getTime();
                    list = list.filter((e) => new Date(e.createdAt).getTime() >= from);
                }
                if (f.endDate) {
                    const to = new Date(f.endDate);
                    to.setHours(23, 59, 59, 999);
                    list = list.filter((e) => new Date(e.createdAt).getTime() <= to.getTime());
                }
                setEntries(list);
                setTotal(data.total || list.length);
            } else {
                setEntries([]);
            }
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, activeGame]);

    useEffect(() => {
        fetchEntries(page, appliedFilters, activeGame);
    }, [activeGame, page, appliedFilters, fetchEntries]);

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const handleResetFilters = () => {
        const empty = { userId: '', status: '', startDate: '', endDate: '' };
        setFilters(empty);
        setAppliedFilters(empty);
        setPage(1);
    };

    const handleLogout = () => {
        clearAdminSession();
        navigate('/');
    };

    const summary = useMemo(() => {
        const totalWagered = entries.reduce((s, g) => s + (g.betAmount || 0), 0);
        const totalPayout = entries.reduce((s, g) => s + (g.payout || 0), 0);
        const wins = entries.filter((s) => (s.payout || 0) > 0).length;
        return { totalWagered, totalPayout, wins, losses: entries.length - wins };
    }, [entries]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <AdminLayout onLogout={handleLogout} title="Game History">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Game History</h1>

            {/* Game Tabs */}
            <div className="flex gap-2 mb-5 border-b border-gray-200 pb-0">
                {GAME_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setActiveGame(tab.key); setPage(1); }}
                        className={`px-5 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
                            activeGame === tab.key
                                ? 'border-orange-500 text-orange-600 bg-orange-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input
                    type="text"
                    placeholder="Player ID"
                    value={filters.userId}
                    onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800 text-sm"
                />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800 text-sm"
                >
                    <option value="">All Results</option>
                    <option value="win">Win</option>
                    <option value="lost">Lost</option>
                </select>
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800 text-sm"
                />
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800 text-sm"
                />
                <div className="sm:col-span-2 md:col-span-4 flex gap-2">
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors"
                    >
                        Apply Filters
                    </button>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && entries.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Total Bets', value: entries.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'Wins', value: summary.wins, color: 'bg-green-50 border-green-200 text-green-700' },
                        { label: 'Losses', value: summary.losses, color: 'bg-red-50 border-red-200 text-red-700' },
                        { label: 'Total Wagered', value: `₹${formatNum(summary.totalWagered)}`, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                    ].map((c) => (
                        <div key={c.label} className={`rounded-lg border p-3 text-center ${c.color}`}>
                            <div className="text-xs font-semibold opacity-70">{c.label}</div>
                            <div className="text-lg font-bold">{c.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Roulette History Table */}
            {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading game history...</div>
                ) : entries.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
                        No game history found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm bg-white">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700">#</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Player</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Game</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-gray-700">Bet / Result</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Wagered</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Payout</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Profit/Loss</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-gray-700">Result</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {entries.map((entry, i) => {
                                        const won = entry.status === 'won' || (Number(entry.payout) || 0) > 0;
                                        const profit = (Number(entry.payout) || 0) - (Number(entry.betAmount) || 0);
                                        const player = entry.user;
                                        return (
                                            <tr key={entry.id || i} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-500 text-xs">{(page - 1) * LIMIT + i + 1}</td>
                                                <td className="px-3 py-2 font-medium text-gray-800">{player?.username || player?.phone || '—'}</td>
                                                <td className="px-3 py-2 text-gray-800 font-semibold">{entry.gameName || entry.gameCode || '—'}</td>
                                                <td className="px-3 py-2 text-center text-gray-700">
                                                    {entry.winningNumber != null ? entry.winningNumber : (entry.betNumber || '—')}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{formatNum(entry.betAmount)}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-800">₹{formatNum(entry.payout)}</td>
                                                <td className={`px-3 py-2 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {profit >= 0 ? '+' : ''}₹{formatNum(profit)}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {won ? 'WIN' : 'LOST'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatTime(entry.createdAt)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                                <span className="text-sm text-gray-500">
                                    Page {page} of {totalPages} &nbsp;·&nbsp; {total} total records
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
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
