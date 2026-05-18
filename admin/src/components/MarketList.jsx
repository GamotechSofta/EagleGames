import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';

const MarketList = ({ markets, onEdit, onDelete, apiBaseUrl, getAuthHeaders }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [secretPassword, setSecretPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [hasSecretDeclarePassword, setHasSecretDeclarePassword] = useState(false);
    const [marketToDelete, setMarketToDelete] = useState(null);

    useEffect(() => {
        fetchWithAuth(`${apiBaseUrl}/admin/me/secret-declare-password-status`)
            .then((res) => { if (res.status === 401) return; return res.json(); })
            .then((json) => {
                if (json && json.success) setHasSecretDeclarePassword(json.hasSecretDeclarePassword || false);
            })
            .catch(() => setHasSecretDeclarePassword(false));
    }, [apiBaseUrl]);

    const performDelete = async (marketId, secretDeclarePasswordValue, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm(t('ml_deleteConfirm'))) return;
        try {
            const options = { method: 'DELETE' };
            if (secretDeclarePasswordValue) {
                options.body = JSON.stringify({ secretDeclarePassword: secretDeclarePasswordValue });
            }
            const response = await fetchWithAuth(`${apiBaseUrl}/markets/delete-market/${marketId}`, options);
            if (response.status === 401) return;
            const data = await response.json();
            if (data.success) {
                setShowPasswordModal(false);
                setMarketToDelete(null);
                setSecretPassword('');
                setPasswordError('');
                onDelete();
            } else {
                if (data.code === 'INVALID_SECRET_DECLARE_PASSWORD') {
                    setPasswordError(data.message || t('ml_invalidSecret'));
                } else {
                    alert(data.message || t('ml_failedDelete'));
                }
            }
        } catch (err) {
            alert(t('networkErrorShort'));
        }
    };

    const handleDelete = (marketId) => {
        if (hasSecretDeclarePassword) {
            setMarketToDelete(marketId);
            setShowPasswordModal(true);
            setSecretPassword('');
            setPasswordError('');
        } else {
            performDelete(marketId, '');
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (!marketToDelete) return;
        const val = secretPassword.trim();
        if (hasSecretDeclarePassword && !val) {
            setPasswordError(t('ml_enterSecretPassword'));
            return;
        }
        performDelete(marketToDelete, val, true);
    };

    const getMarketStatus = (market) => {
        const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
        const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
        // If both results are declared, market is closed
        if (hasOpening && hasClosing) return { status: 'closed', color: 'bg-red-500' };
        // Otherwise, market is open (from 12 AM until closing time)
        return { status: 'open', color: 'bg-green-500' };
    };

    return (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
            {markets.map((market) => {
                const status = getMarketStatus(market);
                const resultDisplay = market.displayResult || '***-**-***';

        const statusOpen = t('open');
        const statusClosed = t('closed');

                return (
                    <div
                        key={market._id}
                        className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 lg:p-6 hover:border-blue-300 hover:shadow-md transition-all min-w-0 overflow-hidden"
                    >
                        {/* Top row: status (left) + result (right) */}
                        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                            <div className={`${status.color} text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shrink-0`}>
                                {status.status === 'open' && statusOpen}
                                {status.status === 'closed' && statusClosed}
                            </div>
                            <div className="text-blue-500 font-mono font-semibold text-xs sm:text-sm text-right leading-tight px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                                {resultDisplay}
                            </div>
                        </div>

                        {/* Market Info */}
                        <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-800 mb-2 truncate" title={market.marketName}>
                            {market.marketName}
                        </h3>
                        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 text-[11px] sm:text-sm text-gray-500 min-w-0">
                            <p className="truncate"><span className="font-semibold text-gray-600">{t('ml_opening')}</span> {market.startingTime}</p>
                            <p className="truncate"><span className="font-semibold text-gray-600">{t('ml_closing')}</span> {market.closingTime}</p>
                            {market.betClosureTime != null && market.betClosureTime !== '' && (
                                <p><span className="font-semibold text-gray-600">{t('ml_betClosure')}</span> {market.betClosureTime} {t('ml_sec')}</p>
                            )}
                            {market.winNumber && (
                                <p><span className="font-semibold text-gray-600">{t('ml_winNumber')}</span> <span className="text-green-600 font-mono">{market.winNumber}</span></p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            <button
                                onClick={() => onEdit(market)}
                                className="px-2 sm:px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-[11px] sm:text-sm font-semibold min-h-[36px] sm:min-h-0"
                            >
                                {t('edit')}
                            </button>
                            <button
                                onClick={() => handleDelete(market._id)}
                                className="px-2 sm:px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[11px] sm:text-sm font-semibold min-h-[36px] sm:min-h-0"
                            >
                                {t('delete')}
                            </button>
                            <button
                                onClick={() => navigate(`/markets/${market._id}`)}
                                className="col-span-2 px-2 sm:px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[11px] sm:text-sm font-semibold min-h-[36px] sm:min-h-0"
                            >
                                {t('view')}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Secret declare password modal for delete */}
        {showPasswordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full p-6">
                    <h3 className="text-lg font-bold text-blue-500 mb-2">{t('ml_secretModalTitle')}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        {t('ml_secretModalHint')}
                    </p>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input
                            type="password"
                            value={secretPassword}
                            onChange={(e) => { setSecretPassword(e.target.value); setPasswordError(''); }}
                            placeholder={t('ml_secretPlaceholder')}
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg"
                            >
                                {t('ml_deleteMarket')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowPasswordModal(false); setMarketToDelete(null); setSecretPassword(''); setPasswordError(''); }}
                                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-200"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
};

export default MarketList;
