import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth, getAuthHeaders } from '../config/api';
import { UPI_INTENT_SESSION_KEY } from '../utils/upiIntent';

function markIntentFinished(intentRef) {
    try {
        sessionStorage.setItem(`upi_intent_finished_${intentRef}`, '1');
    } catch {
        /* ignore */
    }
}

function wasIntentAlreadyFinished(intentRef) {
    try {
        return sessionStorage.getItem(`upi_intent_finished_${intentRef}`) === '1';
    } catch {
        return false;
    }
}

/**
 * After return from UPI app: automatically confirms with server (success by default).
 * `assumeFailure` — only when URL/gateway explicitly indicates failure.
 */
export default function UpiOutcomeModal({
    open,
    intentRef,
    amountLabel,
    onClose,
    onSuccess,
    onFailed,
    onResultAck,
    assumeFailure = false,
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null); // 'success' | 'failed' | null
    const runOnce = useRef(false);

    useEffect(() => {
        runOnce.current = false;
        setDone(null);
        setError('');
    }, [intentRef]);

    const clearSession = () => {
        try {
            sessionStorage.removeItem(UPI_INTENT_SESSION_KEY);
        } catch {
            /* ignore */
        }
    };

    const applyWalletBalance = (data) => {
        const bal = data?.data?.walletBalance;
        if (bal == null) return;
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.balance = bal;
            u.walletBalance = bal;
            localStorage.setItem('user', JSON.stringify(u));
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
                const data = await res.json().catch(() => ({}));

                const msg = String(data.message || '');
                const alreadyDone = res.status === 404 || /no pending payment/i.test(msg);

                if (data.success) {
                    clearSession();
                    markIntentFinished(intentRef);
                    if (outcome === 'success') {
                        applyWalletBalance(data);
                        setDone('success');
                        onSuccess?.(data);
                    } else {
                        setDone('failed');
                        onFailed?.(data);
                    }
                    return;
                }

                if (alreadyDone && outcome === 'success') {
                    clearSession();
                    markIntentFinished(intentRef);
                    setDone('success');
                    onSuccess?.(data);
                    return;
                }

                setError(msg || 'Could not update payment');
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
        if (!open || !intentRef) return;
        if (wasIntentAlreadyFinished(intentRef)) {
            runOnce.current = true;
            setDone('success');
            return;
        }
        if (runOnce.current) return;
        runOnce.current = true;
        const outcome = assumeFailure ? 'failed' : 'success';
        finish(outcome);
    }, [open, intentRef, assumeFailure, finish]);

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
                role="status"
                aria-live="polite"
                className="bg-[#111827] rounded-2xl max-w-sm w-full p-6 border-2 border-[#374151] shadow-xl text-center"
            >
                <div className="w-12 h-12 border-2 border-[#1a74e5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Back from payment app</h3>
                {amountLabel && (
                    <p className="text-[#1a74e5] font-extrabold text-center text-lg mb-2">{amountLabel}</p>
                )}
                <p className="text-gray-400 text-sm mb-4">
                    Confirming your payment with the server…
                </p>
                {error && (
                    <div className="mb-3 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
                        {error}
                    </div>
                )}
                {error && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            runOnce.current = false;
                            setError('');
                            finish(assumeFailure ? 'failed' : 'success');
                        }}
                        className="w-full py-3 rounded-xl bg-[#1a74e5] text-white font-semibold disabled:opacity-50"
                    >
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
}
