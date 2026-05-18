import React from 'react';
import { FaArrowRight, FaEquals, FaMinus } from 'react-icons/fa';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const FormulaCard = ({ label, hint, value, valueClass, borderClass, highlight }) => (
    <div className={`flex-1 rounded-xl border p-4 min-w-0 ${borderClass} ${highlight ? 'shadow-sm' : ''}`}>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1 truncate ${valueClass}`}>{value}</p>
        <p className="text-[11px] text-gray-500 mt-1 leading-snug">{hint}</p>
    </div>
);

/**
 * Clear house P&L: money collected from bets minus payouts to winners.
 */
const ProfitLossPanel = ({ revenue, bets, periodLabel, t }) => {
    const collected = Number(revenue?.total) || 0;
    const payouts = Number(revenue?.payouts) || 0;
    const houseProfit = Number(revenue?.netProfit) ?? collected - payouts;
    const isProfit = houseProfit >= 0;
    const marginPct = collected > 0 ? ((houseProfit / collected) * 100).toFixed(1) : '0.0';
    const betCount = bets?.total ?? 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('dash_plTitle')}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    {t('dash_plSubtitle')} · <span className="text-blue-600 font-medium">{periodLabel}</span>
                </p>
            </div>

            <div className="p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4 mb-6">
                    <FormulaCard
                        label={t('dash_plCollected')}
                        hint={t('dash_plCollectedHint')}
                        value={formatCurrency(collected)}
                        valueClass="text-emerald-700"
                        borderClass="border-emerald-200 bg-emerald-50/80"
                    />
                    <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 shrink-0">
                        <FaMinus className="w-4 h-4" />
                    </div>
                    <p className="lg:hidden text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('dash_plMinus')}
                    </p>
                    <FormulaCard
                        label={t('dash_plPaidWinners')}
                        hint={t('dash_plPaidWinnersHint')}
                        value={formatCurrency(payouts)}
                        valueClass="text-red-600"
                        borderClass="border-red-200 bg-red-50/80"
                    />
                    <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 shrink-0">
                        <FaEquals className="w-4 h-4" />
                    </div>
                    <p className="lg:hidden text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('dash_plEquals')}
                    </p>
                    <FormulaCard
                        label={t('dash_plHouseProfit')}
                        hint={t('dash_plHouseProfitHint')}
                        value={formatCurrency(houseProfit)}
                        valueClass={isProfit ? 'text-blue-700' : 'text-red-700'}
                        borderClass={isProfit ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-red-300 bg-red-50 ring-2 ring-red-100'}
                        highlight
                    />
                </div>

                <div
                    className={`rounded-xl px-4 py-3 sm:px-5 sm:py-4 flex flex-wrap items-center justify-between gap-3 ${
                        isProfit ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                    }`}
                >
                    <div>
                        <p className="text-xs sm:text-sm font-medium opacity-90">{t('dash_plResultLabel')}</p>
                        <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums">{formatCurrency(houseProfit)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                        <span className="px-3 py-1 rounded-lg bg-white/15 font-medium">
                            {t('dash_plMargin', { pct: marginPct })}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white/15 font-medium">
                            {t('dash_plBetCount', { count: betCount })}
                        </span>
                    </div>
                </div>

                <p className="mt-4 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                    <FaArrowRight className="inline w-3 h-3 mr-1 text-blue-500" />
                    {isProfit ? t('dash_plExplainProfit') : t('dash_plExplainLoss')}
                </p>
            </div>
        </div>
    );
};

export default ProfitLossPanel;
