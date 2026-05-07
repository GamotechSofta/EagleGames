import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate, Link } from 'react-router-dom';
import { SkeletonCard } from '../components/Skeleton';
import {
    FaChartLine,
    FaUsers,
    FaMoneyBillWave,
    FaChartBar,
    FaSyncAlt,
    FaWallet,
    FaCreditCard,
    FaUserFriends,
    FaLifeRing,
    FaClipboardList,
    FaArrowRight,
    FaExclamationTriangle,
} from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
import { getAuthHeaders, clearAdminSession, fetchWithAuth } from '../lib/auth';

const buildDatePresets = (t) => [
    { id: 'all', label: t('preset_all'), getRange: () => ({ from: '', to: '' }) },
    { id: 'today', label: t('preset_today'), getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'yesterday', label: t('preset_yesterday'), getRange: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        const from = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { from, to: from };
    }},
    { id: 'this_week', label: t('preset_thisWeek'), getRange: () => {
        const d = new Date();
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'last_week', label: t('preset_lastWeek'), getRange: () => {
        const d = new Date();
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day - 7);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { from: fmt(sun), to: fmt(sat) };
    }},
    { id: 'this_month', label: t('preset_thisMonth'), getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth();
        const last = new Date(y, m + 1, 0);
        const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { from, to };
    }},
    { id: 'last_month', label: t('preset_lastMonth'), getRange: () => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth() - 1;
        const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const last = new Date(y, m + 1, 0);
        const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
        return { from, to };
    }},
];

const formatRangeLabel = (from, to, t) => {
    if (!from || !to) return t('preset_today');
    if (from === to) {
        const d = new Date(from + 'T12:00:00');
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const a = new Date(from + 'T12:00:00');
    const b = new Date(to + 'T12:00:00');
    return `${a.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/** Section card wrapper */
const SectionCard = ({ title, description, icon: Icon, children, linkTo, linkLabel }) => (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:border-gray-200/80 transition-all">
        <div className="flex items-start justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 text-orange-500" />}
                    {title}
                </h3>
                {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
            {linkTo && (
                <Link to={linkTo} className="text-xs font-medium text-orange-500 hover:text-orange-600 flex items-center gap-1">
                    {linkLabel} <FaArrowRight className="w-3 h-3" />
                </Link>
            )}
        </div>
        {children}
    </div>
);

/** Stat row */
const StatRow = ({ label, value, subValue, colorClass = 'text-gray-800' }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-200 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="text-right">
            <span className={`font-semibold font-mono ${colorClass}`}>{value}</span>
            {subValue && <span className="text-xs text-gray-500 ml-2">{subValue}</span>}
        </div>
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const PRESETS = useMemo(() => buildDatePresets(t), [t]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [datePreset, setDatePreset] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [customMode, setCustomMode] = useState(false);
    const [customOpen, setCustomOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [adminRole, setAdminRole] = useState('');
    const [marketOptions, setMarketOptions] = useState([]);
    const [selectedMarketId, setSelectedMarketId] = useState('');

    const getFromTo = () => {
        if (customMode && customFrom && customTo) return { from: customFrom, to: customTo };
        const preset = PRESETS.find((p) => p.id === datePreset);
        return preset ? preset.getRange() : PRESETS[0].getRange();
    };

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/');
            return;
        }
        try {
            const parsed = JSON.parse(admin);
            setAdminRole(parsed.role || '');
        } catch (_) {}
        fetchDashboardStats();
        fetchMarketOptions();
    }, [navigate]);

    const fetchMarketOptions = async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/markets/list-for-dashboard`);
            if (response.status === 401) return;
            const data = await response.json();
            if (data?.success && Array.isArray(data?.data)) {
                const options = data.data
                    .map((m) => ({
                        id: m?._id != null ? String(m._id) : '',
                        name: (m?.displayLabel || m?.marketName || m?.gameName || '').toString().trim(),
                    }))
                    .filter((m) => m.id && m.name)
                    .sort((a, b) => a.name.localeCompare(b.name));
                setMarketOptions(options);
            }
        } catch (_) {
            // keep empty on error
        }
    };

    const fetchDashboardStats = async (rangeOverride, options = {}) => {
        const isRefresh = options.refresh === true;
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');
            const { from, to } = rangeOverride || getFromTo();
            const params = new URLSearchParams();
            if (from && to) { params.set('from', from); params.set('to', to); }
            const marketId = options.marketIdOverride !== undefined ? options.marketIdOverride : selectedMarketId;
            if (marketId) params.set('marketId', marketId);
            if (isRefresh) params.set('_', String(Date.now()));
            const query = params.toString();
            const url = `${API_BASE_URL}/dashboard/stats${query ? `?${query}` : ''}`;
            const response = await fetchWithAuth(url, {
                cache: isRefresh ? 'no-store' : 'default',
            });
            if (response.status === 401) return;
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                setError(t('failedFetchDashboardStats'));
            }
        } catch (err) {
            setError(t('login_network_error'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => fetchDashboardStats(undefined, { refresh: true });
    const handlePresetSelect = (presetId) => {
        setDatePreset(presetId);
        setCustomMode(false);
        setCustomOpen(false);
        const preset = PRESETS.find((p) => p.id === presetId);
        const range = preset ? preset.getRange() : PRESETS[0].getRange();
        fetchDashboardStats(range);
    };
    const handleCustomToggle = () => { setCustomMode(true); setCustomOpen((o) => !o); };
    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        if (new Date(customFrom) > new Date(customTo)) return;
        setCustomMode(true);
        setCustomOpen(false);
        fetchDashboardStats({ from: customFrom, to: customTo });
    };

    const handleLogout = () => {
        clearAdminSession();
        navigate('/');
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

    const pendingPayments = stats?.payments?.pending || 0;
    const pendingDeposits = stats?.payments?.pendingDeposits ?? stats?.payments?.pending ?? 0;
    const pendingWithdrawals = stats?.payments?.pendingWithdrawals ?? 0;
    const helpDeskOpen = stats?.helpDesk?.open || 0;
    const isSuperAdmin = adminRole === 'super_admin';
    const marketsPendingResultList = stats?.marketsPendingResultList || [];
    const starlinePendingList = marketsPendingResultList.filter((m) => (m.marketType || '').toString().toLowerCase() === 'startline');
    const mainPendingList = marketsPendingResultList.filter((m) => (m.marketType || '').toString().toLowerCase() !== 'startline');
    const starlinePendingCount = starlinePendingList.length;
    const mainPendingCount = mainPendingList.length;
    const marketsPendingResult = marketsPendingResultList.length;
    // Help Desk open tickets should not trigger the "Action Required" banner.
    const hasActionRequired = pendingPayments > 0 || marketsPendingResult > 0;

    if (loading) {
        return (
            <AdminLayout onLogout={handleLogout} title={t('dashboard')}>
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('dash_overviewTitle')}</h1>
                    <p className="text-gray-400 text-sm mt-2">{t('dash_loadingHint')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout onLogout={handleLogout} title={t('dashboard')}>
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <FaExclamationTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-red-500 text-lg font-medium mb-2">{error}</p>
                    <button onClick={fetchDashboardStats} className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl">
                        {t('retry')}
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const displayLabel = customMode && customFrom && customTo ? formatRangeLabel(customFrom, customTo, t) : (PRESETS.find((p) => p.id === datePreset)?.label || t('preset_today'));
    const selectedMarketName = marketOptions.find((m) => m.id === selectedMarketId)?.name || t('allMarkets');

    return (
        <AdminLayout onLogout={handleLogout} title={t('dashboard')}>
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <FaChartLine className="w-5 h-5 text-orange-500" />
                            </span>
                            {t('dash_overviewTitle')}
                        </h1>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dateRange')}</p>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 transition-all disabled:opacity-60 text-xs font-medium"
                        >
                            <FaSyncAlt className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            {t('refresh')}
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {PRESETS.map((p) => {
                            const isActive = !customMode && datePreset === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handlePresetSelect(p.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleCustomToggle}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold ${customMode ? 'bg-orange-500 text-white' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {t('custom')}
                        </button>
                        {customOpen && (
                            <div className="flex flex-wrap items-end gap-3 w-full mt-3 p-3 rounded-lg bg-white border border-gray-200">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('from')}</label>
                                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('to')}</label>
                                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800" />
                                </div>
                                <button type="button" onClick={handleCustomApply} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm">
                                    {t('apply')}
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('showingDataFor')} <span className="text-orange-500 font-medium">{displayLabel}</span></p>
                    <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{t('marketFilter')}</p>
                        <select
                            value={selectedMarketId}
                            onChange={(e) => {
                                const nextMarketId = e.target.value;
                                setSelectedMarketId(nextMarketId);
                                const range = customMode && customFrom && customTo
                                    ? { from: customFrom, to: customTo }
                                    : getFromTo();
                                fetchDashboardStats(range, { marketIdOverride: nextMarketId });
                            }}
                            className="w-full sm:w-auto min-w-[260px] px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-800"
                        >
                            <option value="">{t('allMarkets')}</option>
                            {marketOptions.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">{t('selectedMarketLine')} <span className="text-orange-500 font-medium">{selectedMarketName}</span></p>
                    </div>
                </div>
            </div>

            {/* Action Required */}
            {hasActionRequired && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-200">
                    <h3 className="text-sm font-semibold text-orange-500 flex items-center gap-2 mb-3">
                        <FaExclamationTriangle className="w-4 h-4" />
                        {t('dash_actionRequired')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {pendingPayments > 0 && (
                            <Link to="/payment-management" className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm">
                                {pendingPayments === 1
                                    ? t('dash_payment_pending_one', { count: pendingPayments })
                                    : t('dash_payment_pending_many', { count: pendingPayments })}
                            </Link>
                        )}
                        {/* Help Desk tickets are shown only inside the Help Desk section-card (super admin). */}
                        {starlinePendingCount > 0 && (
                            <Link to="/markets" state={{ marketType: 'starline' }} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm">
                                {starlinePendingCount === 1
                                    ? t('dash_starline_pending_one', { count: starlinePendingCount })
                                    : t('dash_starline_pending_many', { count: starlinePendingCount })}
                            </Link>
                        )}
                        {mainPendingCount > 0 && (
                            <Link to="/add-result" className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm">
                                {mainPendingCount === 1
                                    ? t('dash_market_pending_one', { count: mainPendingCount })
                                    : t('dash_market_pending_many', { count: mainPendingCount })}
                            </Link>
                        )}
                    </div>
                    {(starlinePendingList.length > 0 || mainPendingList.length > 0) && (
                        <p className="text-xs text-orange-700 mt-2">
                            {starlinePendingList.length > 0 && (
                                <span>{t('dash_starlinePrefix')} {starlinePendingList.map((m) => m.marketName).join(', ')}</span>
                            )}
                            {starlinePendingList.length > 0 && mainPendingList.length > 0 && ' · '}
                            {mainPendingList.length > 0 && (
                                <span>{t('dash_marketsPrefix')} {mainPendingList.map((m) => m.marketName).join(', ')}</span>
                            )}
                        </p>
                    )}
                </div>
            )}

            {/* Primary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-transparent rounded-xl p-5 border border-green-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('dash_totalRevenuePeriod')}</p>
                    <p className="text-2xl font-bold text-green-600 font-mono">{formatCurrency(stats?.revenue?.total)}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('dash_betAmountCollected')}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-transparent rounded-xl p-5 border border-blue-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('dash_netProfitPeriod')}</p>
                    <p className="text-2xl font-bold text-blue-600 font-mono">{formatCurrency(stats?.revenue?.netProfit)}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('dash_revenueMinusPayouts')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-transparent rounded-xl p-5 border border-purple-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('dash_totalPlayersAllTime')}</p>
                    <p className="text-2xl font-bold text-purple-600 font-mono">{stats?.users?.total ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('dash_activeNewInRange', { active: stats?.users?.active ?? 0, newInRange: stats?.users?.newToday ?? 0 })}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-transparent rounded-xl p-5 border border-orange-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('dash_totalBetsPeriod')}</p>
                    <p className="text-2xl font-bold text-orange-500 font-mono">{stats?.bets?.total ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('dash_winRate', { pct: stats?.bets?.winRate ?? 0 })}</p>
                </div>
            </div>

            {/* Detailed Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                {/* Revenue Details */}
                <SectionCard title={t('dash_revenuePayouts')} description={t('dash_selectedPeriod')} icon={FaMoneyBillWave} linkTo="/reports" linkLabel={t('dash_reportsLink')}>
                    <StatRow label={t('dash_totalRevenue')} value={formatCurrency(stats?.revenue?.total)} colorClass="text-green-600" />
                    <StatRow label={t('dash_totalPayouts')} value={formatCurrency(stats?.revenue?.payouts)} colorClass="text-red-500" />
                    <StatRow label={t('dash_netProfit')} value={formatCurrency(stats?.revenue?.netProfit)} colorClass="text-blue-600" />
                </SectionCard>

                {/* Players */}
                <SectionCard title={t('dash_playersSection')} description={t('dash_allTimeCounts')} icon={FaUserFriends} linkTo="/all-users" linkLabel={t('allPlayers')}>
                    <StatRow label={t('dash_totalPlayers')} value={stats?.users?.total ?? 0} />
                    <StatRow label={t('dash_activePlayers')} value={stats?.users?.active ?? 0} colorClass="text-green-600" />
                    <StatRow label={t('dash_newInPeriod')} value={stats?.users?.newToday ?? 0} colorClass="text-orange-500" />
                </SectionCard>

                {/* Bets */}
                <SectionCard title={t('dash_betsSection')} description={t('dash_selectedPeriod')} icon={FaChartBar} linkTo="/bet-history" linkLabel={t('title_betHistory')}>
                    <StatRow label={t('dash_totalBets')} value={stats?.bets?.total ?? 0} />
                    <StatRow label={t('dash_winningBets')} value={stats?.bets?.winning ?? 0} colorClass="text-green-600" />
                    <StatRow label={t('dash_losingBets')} value={stats?.bets?.losing ?? 0} colorClass="text-red-500" />
                    <StatRow label={t('dash_pendingBets')} value={stats?.bets?.pending ?? 0} colorClass="text-orange-500" />
                    <StatRow label={t('dash_winRateRow')} value={`${stats?.bets?.winRate ?? 0}%`} />
                </SectionCard>

                {/* Markets */}
                <SectionCard title={t('markets')} description={t('dash_mainStarline')} icon={FaChartBar} linkTo="/markets" linkLabel={t('markets')}>
                    <StatRow label={t('dash_totalMarkets')} value={stats?.markets?.total ?? 0} />
                    <StatRow label={t('dash_openNow')} value={stats?.markets?.open ?? 0} colorClass="text-green-600" />
                    <StatRow label={t('dash_resultPending')} value={marketsPendingResult} colorClass={marketsPendingResult > 0 ? 'text-orange-500' : 'text-gray-400'} />
                    <StatRow label={t('dash_mainMarkets')} value={stats?.markets?.main ?? stats?.markets?.total ?? 0} subValue={t('dash_openCount', { n: stats?.markets?.openMain ?? 0 })} />
                    <StatRow label={t('dash_starlineMarkets')} value={stats?.markets?.starline ?? 0} subValue={t('dash_openCount', { n: stats?.markets?.openStarline ?? 0 })} />
                </SectionCard>

                {/* Payments */}
                <SectionCard title={t('payments')} description={t('dash_depositsWithdrawals')} icon={FaCreditCard} linkTo="/payment-management" linkLabel={t('dash_managePayments')}>
                    <StatRow label={t('dash_depositsPeriod')} value={formatCurrency(stats?.payments?.totalDeposits)} colorClass="text-green-600" />
                    <StatRow label={t('dash_withdrawalsPeriod')} value={formatCurrency(stats?.payments?.totalWithdrawals)} colorClass="text-red-500" />
                    <StatRow label={t('dash_pendingDeposits')} value={pendingDeposits} colorClass="text-orange-500" />
                    <StatRow label={t('dash_pendingWithdrawals')} value={pendingWithdrawals} colorClass="text-orange-500" />
                    <StatRow label={t('dash_totalPending')} value={pendingPayments} colorClass="text-orange-500" />
                </SectionCard>

                {/* Wallet */}
                <SectionCard title={t('dash_walletBalance')} description={t('dash_allPlayersCombined')} icon={FaWallet} linkTo="/wallet" linkLabel={t('wallet')}>
                    <StatRow label={t('dash_totalBalance')} value={formatCurrency(stats?.wallet?.totalBalance)} colorClass="text-green-600" />
                </SectionCard>

                {/* Bookies (Super Admin only) */}
                {adminRole === 'super_admin' && (
                    <SectionCard title={t('dash_bookieAccounts')} description={t('dash_allTime')} icon={FaUsers} linkTo="/bookie-management" linkLabel={t('dash_manageBookies')}>
                        <StatRow label={t('dash_totalBookies')} value={stats?.bookies?.total ?? 0} />
                        <StatRow label={t('dash_activeBookies')} value={stats?.bookies?.active ?? 0} colorClass="text-green-600" />
                    </SectionCard>
                )}

                {/* Help Desk */}
                {isSuperAdmin && (
                    <SectionCard title={t('dash_helpDeskSection')} description={t('dash_supportTickets')} icon={FaLifeRing} linkTo="/help-desk" linkLabel={t('helpDeskIssues')}>
                        <StatRow label={t('dash_totalTickets')} value={stats?.helpDesk?.total ?? 0} />
                        <StatRow label={t('dash_openTickets')} value={stats?.helpDesk?.open ?? 0} colorClass="text-orange-500" />
                        <StatRow label={t('dash_inProgress')} value={stats?.helpDesk?.inProgress ?? 0} colorClass="text-blue-600" />
                    </SectionCard>
                )}
            </div>

            {/* Revenue Timeline (period summary) */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaMoneyBillWave className="w-4 h-4 text-orange-500" />
                    {t('dash_revenueSummaryTitle')}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{t('dash_revenueSummaryHint')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">{t('dash_totalRevenue')}</p>
                        <p className="text-xl font-bold text-green-600 font-mono">{formatCurrency(stats?.revenue?.total)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">{t('dash_totalPayouts')}</p>
                        <p className="text-xl font-bold text-red-500 font-mono">{formatCurrency(stats?.revenue?.payouts)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-500 text-sm mb-1">{t('dash_netProfit')}</p>
                        <p className="text-xl font-bold text-blue-600 font-mono">{formatCurrency(stats?.revenue?.netProfit)}</p>
                    </div>
                </div>
            </div>

            {isSuperAdmin && !selectedMarketId && (
                <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FaChartBar className="w-4 h-4 text-orange-500" />
                        {t('dash_marketWiseTitle')}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                        {t('dash_marketWiseHint')}
                    </p>
                    {!stats?.marketWise?.length ? (
                        <p className="text-sm text-gray-500">{t('dash_noBetsPeriod')}</p>
                    ) : (
                        <div className="overflow-x-auto -mx-1">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-200">
                                        <th className="py-2 px-1 sm:px-2 font-medium">{t('markets')}</th>
                                        <th className="py-2 px-1 sm:px-2 font-medium text-right">{t('dash_colBets')}</th>
                                        <th className="py-2 px-1 sm:px-2 font-medium text-right">{t('dash_colRevenue')}</th>
                                        <th className="py-2 px-1 sm:px-2 font-medium text-right">{t('dash_colPayouts')}</th>
                                        <th className="py-2 px-1 sm:px-2 font-medium text-right">{t('dash_colNet')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.marketWise.map((row) => (
                                        <tr key={row.marketId} className="border-b border-gray-100 last:border-0">
                                            <td className="py-2 px-1 sm:px-2 font-medium text-gray-800">{row.marketName}</td>
                                            <td className="py-2 px-1 sm:px-2 text-right font-mono tabular-nums">{row.bets}</td>
                                            <td className="py-2 px-1 sm:px-2 text-right font-mono tabular-nums text-green-600">{formatCurrency(row.revenue)}</td>
                                            <td className="py-2 px-1 sm:px-2 text-right font-mono tabular-nums text-red-500">{formatCurrency(row.payouts)}</td>
                                            <td className="py-2 px-1 sm:px-2 text-right font-mono tabular-nums text-blue-600">{formatCurrency(row.netProfit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Links */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaClipboardList className="w-4 h-4 text-orange-500" />
                    {t('dash_quickLinks')}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{t('dash_quickLinksHint')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <Link to="/add-result" className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-medium transition-all text-center">
                        {t('addResult')}
                    </Link>
                    <Link to="/update-rate" className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-medium transition-all text-center">
                        {t('updateRate')}
                    </Link>
                    <Link to="/add-user" className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-medium transition-all text-center">
                        {t('title_addPlayer')}
                    </Link>
                    <Link to="/add-market" className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-medium transition-all text-center">
                        {t('title_addMarketPage')}
                    </Link>
                    <Link to="/logs" className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-orange-500/20 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-medium transition-all text-center">
                        {t('dash_linkActivityLogs')}
                    </Link>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
