import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders, fetchWithAuth } from '../../config/api';
import UpiOutcomeModal from '../../components/UpiOutcomeModal';
import {
    buildUpiPayUri,
    getUpiPayQueryString,
    UPI_APP_DEEP_LINKS,
    UPI_INTENT_SESSION_KEY,
} from '../../utils/upiIntent';

const PLATFORM_FALLBACK_UPI = '9380158730-2@axl';

const AddFund = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [showPayAppModal, setShowPayAppModal] = useState(false);
    const [activeIntentRef, setActiveIntentRef] = useState('');
    const [startIntentLoading, setStartIntentLoading] = useState(false);
    const [showOutcomePrompt, setShowOutcomePrompt] = useState(false);
    const [outcomeIntentRef, setOutcomeIntentRef] = useState('');
    const [outcomeAmountLabel, setOutcomeAmountLabel] = useState('');

    const fetchConfig = async () => {
        try {
            const headers = { ...getAuthHeaders() };
            const res = await fetch(`${API_BASE_URL}/payments/config`, { headers });
            const data = await res.json();
            if (data.success) setConfig(data.data);
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const depositSource = config?.depositSource || 'platform';
    const displayUpi = config?.upiId || PLATFORM_FALLBACK_UPI;
    const displayPayeeName = config?.upiName || '';

    const quickAmountsStep1 = [200, 500, 1000, 2000];
    const minDeposit = config?.minDeposit ?? 1;
    const maxDeposit = config?.maxDeposit || 50000;
    const qrAmount = (() => {
        const n = Number(amount);
        return Number.isFinite(n) && n > 0 ? n : null;
    })();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const upiPayUri = useMemo(() => {
        if (!displayUpi || qrAmount == null || !activeIntentRef) return '';
        if (qrAmount < minDeposit || qrAmount > maxDeposit) return '';
        const returnUrl = `${origin}/upi-return?ref=${encodeURIComponent(activeIntentRef)}`;
        return buildUpiPayUri(displayUpi, displayPayeeName, qrAmount, {
            tr: activeIntentRef,
            returnUrl,
        });
    }, [displayUpi, displayPayeeName, qrAmount, minDeposit, maxDeposit, activeIntentRef, origin]);

    const upiQueryString = getUpiPayQueryString(upiPayUri);

    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const raw = sessionStorage.getItem(UPI_INTENT_SESSION_KEY);
                if (!raw) return;
                const { ref, amount: amt } = JSON.parse(raw);
                if (ref && typeof ref === 'string') {
                    setOutcomeIntentRef(ref);
                    setOutcomeAmountLabel(
                        amt != null && amt !== '' ? `₹${Number(amt).toLocaleString('en-IN')}` : ''
                    );
                    setShowOutcomePrompt(true);
                }
            } catch {
                /* ignore */
            }
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    const validateAmount = () => {
        const numAmount = Number(amount);
        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            setError(`Amount must be between ₹${minDeposit} and ₹${maxDeposit}`);
            return false;
        }
        return true;
    };

    const cancelPendingIntent = async (intentRef) => {
        if (!intentRef) return;
        try {
            await fetchWithAuth(`${API_BASE_URL}/payments/upi-intent/cancel`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ intentRef }),
            });
        } catch {
            /* ignore */
        }
        setActiveIntentRef('');
        try {
            sessionStorage.removeItem(UPI_INTENT_SESSION_KEY);
        } catch {
            /* ignore */
        }
    };

    const handleAddCash = async () => {
        setError('');
        if (!validateAmount()) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!(user.id || user._id)) {
            setError('Please login to add funds');
            return;
        }

        setStartIntentLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/payments/upi-intent/start`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) }),
            });
            if (res.status === 401) return;
            const data = await res.json();
            if (!data.success) {
                setError(data.message || 'Could not start payment');
                return;
            }
            const ref = data.data?.intentRef;
            if (!ref) {
                setError('Invalid server response');
                return;
            }
            setActiveIntentRef(ref);
            setShowPayAppModal(true);
        } catch (e) {
            console.error(e);
            setError('Network error. Try again.');
        } finally {
            setStartIntentLoading(false);
        }
    };

    const launchUpiApp = (href) => {
        try {
            sessionStorage.setItem(
                UPI_INTENT_SESSION_KEY,
                JSON.stringify({ ref: activeIntentRef, amount: Number(amount), at: Date.now() })
            );
        } catch {
            /* ignore */
        }
        setShowPayAppModal(false);
        window.location.href = href;
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-28">
            {error && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-600 text-sm">{error}</div>
            )}
            <div className="space-y-4 sm:space-y-5">
                <div className="rounded-2xl bg-[#111827] p-0">
                    <div className="bg-[#111827] rounded-2xl shadow-sm border-2 border-[#374151] overflow-hidden">
                        <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-2 flex items-center justify-center gap-2 text-[13px] sm:text-sm text-gray-300">
                            <svg
                                className="w-4 h-4 text-[#1a74e5]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.5 3.5 3.5 16.5 0 20" />
                            </svg>
                            <span className="font-semibold tracking-wide">GoldenBets.com</span>
                        </div>

                        <div className="bg-gradient-to-r from-[#1a74e5] via-[#1a74e5] to-[#1a74e5] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#111827]/30 border border-white/40 flex items-center justify-center shrink-0">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#111827] flex items-center justify-center text-[13px] sm:text-sm font-extrabold text-[#1a74e5]">
                                    ₹
                                </div>
                            </div>
                            <div className="text-white font-extrabold">
                                ₹{' '}
                                {(() => {
                                    try {
                                        const u = JSON.parse(localStorage.getItem('user') || 'null');
                                        const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
                                        return b.toLocaleString('en-IN');
                                    } catch {
                                        return '0';
                                    }
                                })()}
                            </div>
                        </div>

                        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between bg-[#1f2937]">
                            <div className="text-[13px] sm:text-sm text-white font-medium">
                                {(() => {
                                    try {
                                        const u = JSON.parse(localStorage.getItem('user') || 'null');
                                        return u?.username || u?.name || 'User';
                                    } catch {
                                        return 'User';
                                    }
                                })()}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                                <span className="w-3 h-3 rounded-full bg-[#1a74e5] inline-block" />
                            </div>
                        </div>
                    </div>

                    {depositSource === 'bookie' && (
                        <p className="mt-3 text-amber-200/90 text-xs text-center px-2">
                            You pay your agent&apos;s UPI — after paying, confirm status when you return to this app.
                        </p>
                    )}

                    <div className="mt-3 sm:mt-4 flex justify-center">
                        <button
                            type="button"
                            onClick={() => navigate('/support')}
                            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#111827] border-2 border-[#374151] text-[13px] sm:text-sm font-semibold text-gray-200 shadow-sm hover:border-[#4b5563] hover:bg-[#1f2937] transition-colors"
                        >
                            Support
                        </button>
                    </div>

                    <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter Amount"
                            className="flex-1 min-w-0 max-w-[520px] bg-[#111827] border-2 border-[#374151] rounded-full px-4 py-2.5 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                            min={minDeposit}
                            max={maxDeposit}
                        />
                    </div>

                    <div className="mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 max-w-[520px] mx-auto">
                        {quickAmountsStep1.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setAmount(String(amt))}
                                className={`h-8 sm:h-9 rounded-md border-2 text-[13px] sm:text-sm font-semibold shadow-sm transition-colors ${
                                    amount === String(amt)
                                        ? 'bg-[#1a74e5] text-white border-[#1a74e5]'
                                        : 'bg-[#111827] text-gray-200 border-[#374151] hover:border-[#4b5563]'
                                }`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>

                    <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto">
                        <button
                            type="button"
                            onClick={handleAddCash}
                            disabled={startIntentLoading}
                            className="w-full h-9 sm:h-10 rounded-md bg-gradient-to-r bg-[#1a74e5] text-white font-extrabold shadow-md hover:bg-[#155fc2] transition-all disabled:opacity-60"
                        >
                            {startIntentLoading ? 'Starting…' : 'Add Cash'}
                        </button>
                    </div>

                    <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto bg-[#1f2937] rounded-md border-2 border-[#374151] px-3 py-2 text-[10px] sm:text-[11px] text-gray-200">
                        Pay in Google Pay / PhonePe / Paytm. Amount is filled automatically. When you come back, confirm
                        payment status — your passbook updates. No QR or screenshot needed.
                    </div>
                </div>
            </div>

            {showPayAppModal && upiPayUri && qrAmount != null && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pay-app-title"
                        className="bg-[#111827] rounded-2xl max-w-sm w-full p-5 sm:p-6 border-2 border-[#374151] shadow-xl"
                    >
                        <h3 id="pay-app-title" className="text-lg font-bold text-white text-center mb-1">
                            Pay with UPI app
                        </h3>
                        <p className="text-[#1a74e5] font-extrabold text-center text-xl mb-1">
                            ₹{qrAmount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-gray-400 text-sm text-center mb-4">
                            Choose an app. After payment, return here or use the link your app opens — then confirm
                            status.
                        </p>
                        <div className="grid grid-cols-1 gap-2 mb-3">
                            {UPI_APP_DEEP_LINKS.map(({ id, label, build }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => launchUpiApp(build(upiQueryString))}
                                    className="w-full py-3 rounded-xl bg-[#1f2937] border-2 border-[#374151] text-white font-semibold hover:border-[#1a74e5] hover:bg-[#111827] transition-colors text-left px-4"
                                >
                                    {label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => launchUpiApp(upiPayUri)}
                                className="w-full py-3 rounded-xl bg-[#1f2937] border-2 border-[#374151] text-gray-200 font-semibold hover:border-[#1a74e5] transition-colors text-left px-4"
                            >
                                Other UPI app
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                setShowPayAppModal(false);
                                await cancelPendingIntent(activeIntentRef);
                            }}
                            className="w-full py-2 text-gray-500 text-sm hover:text-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {showOutcomePrompt && outcomeIntentRef && (
                <UpiOutcomeModal
                    open={showOutcomePrompt}
                    intentRef={outcomeIntentRef}
                    amountLabel={outcomeAmountLabel}
                    onClose={() => {
                        setShowOutcomePrompt(false);
                        setOutcomeIntentRef('');
                    }}
                    onSuccess={() => {}}
                    onFailed={() => {}}
                    onResultAck={() => navigate('/passbook')}
                />
            )}
        </div>
    );
};

export default AddFund;
