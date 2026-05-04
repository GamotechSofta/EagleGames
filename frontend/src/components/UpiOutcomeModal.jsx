import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth, getAuthHeaders } from '../config/api';
import { UPI_INTENT_SESSION_KEY } from '../utils/upiIntent';

/**
 * After UPI app return: user confirms success or failure; server credits wallet or records rejection + passbook line.
 * `autoSubmitOutcome` — when set (e.g. URL ?status=success), submits once without tapping a button.
 */
export default function UpiOutcomeModal({
    open,
    intentRef,
    amountLabel,
    onClose,
    onSuccess,
    onFailed,
    onResultAck,
    autoSubmitOutcome = null,
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null); // 'success' | 'failed' | null
    const autoFired = useRef(false);

    useEffect(() => {
        autoFired.current = false;
    }, [intentRef]);

    const clearSession = () => {
        try {
            sessionStorage.removeItem(UPI_INTENT_SESSION_KEY);
        } catch {
            /* ignore */
        }
    };

    const finish = useCallback(
        async (outcome) => {
            setError('');
            setBusy(true);
            try {
                const res = await fetchWithAuth(`${API_BASE_URL}/payments/upi-intent/finish`, {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ intentRef, outcome }),
                });
                if (res.status === 401) return;
                const data = await res.json();
                if (!data.success) {
                    setError(data.message || 'Could not update payment');
                    setBusy(false);
                    return;
                }
                clearSession();
                if (outcome === 'success') {
                    const bal = data.data?.walletBalance;
                    if (bal != null) {
                        try {
                            const u = JSON.parse(localStorage.getItem('user') || '{}');
                            u.balance = bal;
                            u.walletBalance = bal;
                            localStorage.setItem('user', JSON.stringify(u));
                        } catch {
                            /* ignore */
                        }
                    }
                    setDone('success');
                    onSuccess?.(data);
                } else {
                    setDone('failed');
                    onFailed?.(data);
                }
            } catch (e) {
                console.error(e);
                setError('Network error. Try again.');
            } finally {
                setBusy(false);
            }
        },
        [intentRef, onSuccess, onFailed]
    );

    useEffect(() => {
        if (!open || !intentRef || !autoSubmitOutcome || autoFired.current) return;
        autoFired.current = true;
        finish(autoSubmitOutcome);
    }, [open, intentRef, autoSubmitOutcome, finish]);

    if (!open || !intentRef) return null;

    if (done === 'success') {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                <div className="bg-[#111827] rounded-2xl max-w-sm w-full p-6 border-2 border-green-400/60 shadow-xl text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Payment confirmed</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Money has been added to your wallet. See Passbook for the credit entry.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setDone(null);
                            onResultAck?.();
                            onClose?.();
                        }}
                        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                        View passbook
                    </button>
                </div>
            </div>
        );
    }

    if (done === 'failed') {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                <div className="bg-[#111827] rounded-2xl max-w-sm w-full p-6 border-2 border-red-500/40 shadow-xl text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Payment not completed</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        No money was added. Check Passbook / deposit history for this attempt.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setDone(null);
                            onResultAck?.();
                            onClose?.();
                        }}
                        className="w-full py-3 rounded-xl bg-[#1f2937] border-2 border-[#374151] text-white font-semibold"
                    >
                        View passbook
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="upi-outcome-title"
                className="bg-[#111827] rounded-2xl max-w-sm w-full p-5 sm:p-6 border-2 border-[#374151] shadow-xl"
            >
                <h3 id="upi-outcome-title" className="text-lg font-bold text-white text-center mb-2">
                    Payment status
                </h3>
                {amountLabel && (
                    <p className="text-[#1a74e5] font-extrabold text-center text-lg mb-2">{amountLabel}</p>
                )}
                <p className="text-gray-400 text-sm text-center mb-4">
                    After you finished in your UPI app, tell us how it went. Your passbook will update.
                </p>
                {error && (
                    <div className="mb-3 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
                        {error}
                    </div>
                )}
                <div className="grid gap-2">
                    {busy && autoSubmitOutcome && (
                        <p className="text-center text-gray-400 text-sm py-2">Confirming with server…</p>
                    )}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => finish('success')}
                        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50"
                    >
                        {busy ? 'Please wait…' : 'Payment successful'}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => finish('failed')}
                        className="w-full py-3 rounded-xl bg-[#1f2937] border-2 border-[#374151] text-gray-200 font-semibold hover:border-red-500/50 disabled:opacity-50"
                    >
                        Payment failed or cancelled
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onClose}
                        className="w-full py-2 text-gray-500 text-sm hover:text-gray-300"
                    >
                        Close (I&apos;ll confirm later)
                    </button>
                </div>
            </div>
        </div>
    );
}
