import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { API_BASE_URL, getAuthHeaders, fetchWithAuth } from '../../config/api';
import platformAdminQr from '../../assets/QRforAdmin.jpeg';

/** Used if the payment config request fails. Platform values normally come from the API (super admin + env + defaults). */
const PLATFORM_FALLBACK_UPI = 'neelamkarande23@okicici';
const PLATFORM_FALLBACK_PAYEE = 'Neelam Karande';
const PLATFORM_FALLBACK_QR = platformAdminQr;

/** NPCI-style UPI intent so the scanned QR pays `am` to `pa` (and shows `pn` when set). */
function buildUpiPayUri(pa, payeeName, amount) {
    const am = Number(amount);
    if (!pa || !Number.isFinite(am) || am <= 0) return '';
    const parts = [`pa=${encodeURIComponent(pa)}`, `am=${encodeURIComponent(am.toFixed(2))}`, 'cu=INR'];
    const pn = String(payeeName || '').trim();
    if (pn) parts.splice(1, 0, `pn=${encodeURIComponent(pn)}`);
    return `upi://pay?${parts.join('&')}`;
}

const AddFund = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [amount, setAmount] = useState('');
    const [upiTransactionId, setUpiTransactionId] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState(0);
    const [step, setStep] = useState(1); // 1 = Amount, 2 = Pay + confirm

    /** Send player JWT when logged in so bookie-specific UPI/QR is returned when applicable. */
    const fetchConfig = async () => {
        try {
            const headers = { ...getAuthHeaders() };
            const res = await fetch(`${API_BASE_URL}/payments/config`, {
                headers,
                cache: 'no-store',
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, [step]);

    const depositSource = config?.depositSource || 'platform';
    const isBookieDeposit = depositSource === 'bookie';
    const displayUpi = config?.upiId || PLATFORM_FALLBACK_UPI;
    const displayPayeeName = config?.upiName || PLATFORM_FALLBACK_PAYEE;
    const displayQr = isBookieDeposit ? (config?.qrImageUrl || null) : (config?.qrImageUrl || PLATFORM_FALLBACK_QR);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            setScreenshot(file);
            setScreenshotPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!(user.id || user._id)) {
            setError('Please login to add funds');
            return;
        }

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount < (config?.minDeposit || 100) || numAmount > (config?.maxDeposit || 50000)) {
            setError(`Amount must be between ₹${config?.minDeposit || 100} and ₹${config?.maxDeposit || 50000}`);
            return;
        }

        const utr = String(upiTransactionId || '').trim();
        if (!utr) {
            setError('Please enter UTR / Transaction ID');
            return;
        }
        if (!/^\d{12}$/.test(utr)) {
            setError('UTR / Transaction ID must be 12 digits');
            return;
        }

        if (!screenshot) {
            setError('Please upload payment screenshot');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('amount', numAmount);
            formData.append('upiTransactionId', utr);
            formData.append('screenshot', screenshot);

            const res = await fetchWithAuth(`${API_BASE_URL}/payments/deposit`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                setSubmittedAmount(numAmount);
                setShowSuccessModal(true);
                setAmount('');
                setUpiTransactionId('');
                setScreenshot(null);
                setScreenshotPreview(null);
                setStep(1);
            } else {
                // Show detailed error message from server
                const errorMsg = data.message || 'Failed to submit request';
                console.error('Deposit request failed:', data);
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Network error:', err);
            setError('Network error. Please check if the server is running and try again.');
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];
    const quickAmountsStep1 = [200, 500, 1000, 2000];
    const minDeposit = config?.minDeposit || 100;
    const maxDeposit = config?.maxDeposit || 50000;
    const qrAmount = (() => {
        const n = Number(amount);
        return Number.isFinite(n) && n > 0 ? n : null;
    })();

    const upiPayUri = useMemo(() => {
        if (!displayUpi || qrAmount == null) return '';
        if (qrAmount < minDeposit || qrAmount > maxDeposit) return '';
        return buildUpiPayUri(displayUpi, displayPayeeName, qrAmount);
    }, [displayUpi, displayPayeeName, qrAmount, minDeposit, maxDeposit]);

    const validateAmount = () => {
        const numAmount = Number(amount);
        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            setError(`Amount must be between ₹${minDeposit} and ₹${maxDeposit}`);
            return false;
        }
        return true;
    };

    const handleAddCash = () => {
        setError('');
        if (!validateAmount()) return;
        setStep(2);
    };

    return (
        <div className={`space-y-4 sm:space-y-6 ${step === 2 ? 'pb-16' : ''}`}>
            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl text-green-600 text-sm">
                    {success}
                </div>
            )}

            {step === 1 ? (
                <div className="space-y-4 sm:space-y-5">
                    <div className="rounded-2xl bg-[#111827] p-0">
                        {/* Top card (as screenshot) */}
                        <div className="bg-[#111827] rounded-2xl shadow-sm border-2 border-[#374151] overflow-hidden">
                            <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-2 flex items-center justify-center gap-2 text-[13px] sm:text-sm text-gray-300">
                                <svg className="w-4 h-4 text-[#1a74e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.5 3.5 3.5 16.5 0 20" />
                                </svg>
                                <span className="font-semibold tracking-wide">Eagle Games</span>
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

                        {/* Support button */}
                        <div className="mt-3 sm:mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => navigate('/support')}
                                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#111827] border-2 border-[#374151] text-[13px] sm:text-sm font-semibold text-gray-200 shadow-sm hover:border-[#4b5563] hover:bg-[#1f2937] transition-colors"
                            >
                                <svg className="w-4 h-4 text-[#1a74e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 10c0 3.866-3.134 7-7 7a7.003 7.003 0 01-4-1.25L3 17l1.25-4A7.003 7.003 0 017 6c0-1.105.895-2 2-2h2a7 7 0 017 7z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
                                </svg>
                                Support
                            </button>
                        </div>

                        {/* Amount input */}
                        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1f2937] border-2 border-[#374151] flex items-center justify-center shadow-sm shrink-0">
                                <svg className="w-5 h-5 text-[#1a74e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                                </svg>
                            </div>
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

                        {/* Quick buttons */}
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

                        {/* Add Cash */}
                        <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto">
                            <button
                                type="button"
                                onClick={handleAddCash}
                                className="w-full h-9 sm:h-10 rounded-md bg-gradient-to-r bg-[#1a74e5] text-white font-extrabold shadow-md  hover:bg-[#155fc2] transition-all"
                            >
                                Add Cash
                            </button>
                        </div>

                        {/* Note */}
                        <div className="mt-2.5 sm:mt-3 max-w-[520px] mx-auto bg-[#1f2937] rounded-md border-2 border-[#374151] px-3 py-2 text-[10px] sm:text-[11px] text-gray-200">
                            Deposit time use only phone pay App Always 🙏🙏
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {/* Pay ₹X — both methods in one compact card */}
                    <div className="bg-[#111827] rounded-xl border border-[#374151] p-3 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span className="text-[#1a74e5] font-extrabold text-base sm:text-lg">
                                    ₹{Number(amount || 0).toLocaleString('en-IN')}
                                </span>
                                {displayPayeeName ? (
                                    <span className="text-gray-500 text-xs sm:text-sm ml-1.5 truncate inline-block align-middle max-w-[140px] sm:max-w-none">
                                        · {displayPayeeName}
                                    </span>
                                ) : null}
                                <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                                    Limits ₹{minDeposit.toLocaleString('en-IN')}–₹{maxDeposit.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1f2937] text-gray-200 text-xs sm:text-sm font-semibold border border-[#4b5563] hover:border-[#6b7280]"
                            >
                                Back
                            </button>
                        </div>
                        {depositSource === 'bookie' && (
                            <p className="text-[10px] sm:text-[11px] text-amber-200/90 leading-snug border-l-2 border-amber-500/60 pl-2">
                                Agent UPI — your agent verifies this payment.
                            </p>
                        )}

                        <p className="text-[11px] text-gray-400 leading-snug">
                            <span className="text-gray-200 font-semibold">Choose one way</span> to pay — use the button{' '}
                            <span className="text-gray-500 font-medium">or</span> scan the QR, not both.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-y-3 gap-x-0 sm:gap-x-2 items-stretch">
                            {/* 1 · UPI app */}
                            <div className="space-y-2 rounded-lg bg-[#1f2937]/50 border border-[#374151] p-2.5 sm:p-3">
                                <p className="text-[11px] font-bold text-[#1a74e5] uppercase tracking-wide">1 · UPI app</p>
                                {upiPayUri ? (
                                    <>
                                        <a
                                            href={upiPayUri}
                                            className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#1a74e5] hover:bg-[#155fc2] text-white text-sm font-bold transition-colors"
                                        >
                                            Pay with UPI app
                                        </a>
                                        <p className="text-[10px] text-gray-500 leading-tight">
                                            Opens UPI apps on your phone with ₹{Number(amount || 0).toLocaleString('en-IN')} ready.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-[11px] text-gray-500">Use option 2 or copy UPI below.</p>
                                )}
                            </div>

                            {/* OR — full-width on mobile; narrow column with vertical guides on sm+ */}
                            <div
                                className="flex sm:hidden flex-row items-center gap-2 w-full py-0.5"
                                role="separator"
                                aria-label="Or choose the other option"
                            >
                                <div className="flex-1 h-px bg-[#4b5563]" />
                                <span className="shrink-0 rounded-full bg-[#111827] border border-[#1a74e5]/50 px-3 py-1 text-[10px] font-black text-[#1a74e5] tracking-widest">
                                    OR
                                </span>
                                <div className="flex-1 h-px bg-[#4b5563]" />
                            </div>
                            <div
                                className="hidden sm:flex flex-col items-center justify-center w-10 shrink-0 self-stretch py-1"
                                role="separator"
                                aria-label="Or choose the other option"
                            >
                                <div className="w-px flex-1 min-h-[12px] bg-[#4b5563]" />
                                <span className="my-2 rounded-full bg-[#111827] border border-[#1a74e5]/50 px-2 py-1 text-[10px] font-black text-[#1a74e5] tracking-widest">
                                    OR
                                </span>
                                <div className="w-px flex-1 min-h-[12px] bg-[#4b5563]" />
                            </div>

                            {/* 2 · Scan QR */}
                            <div className="space-y-2 rounded-lg bg-[#1f2937]/50 border border-[#374151] p-2.5 sm:p-3">
                                <p className="text-[11px] font-bold text-[#1a74e5] uppercase tracking-wide">2 · Scan QR</p>
                                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center sm:justify-start">
                                    <div className="bg-white p-1 rounded-md shrink-0">
                                        {upiPayUri ? (
                                            <QRCode value={upiPayUri} size={112} level="M" />
                                        ) : displayQr ? (
                                            <img src={displayQr} alt="UPI QR" className="w-[112px] h-[112px] object-contain" />
                                        ) : (
                                            <div className="w-[112px] h-[112px] flex items-center justify-center bg-gray-100 text-[10px] text-gray-500 text-center px-1">
                                                No QR
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center sm:text-left leading-tight max-w-[14rem] sm:max-w-none">
                                        <span className="text-gray-400">Instead of the button,</span> scan with any UPI app. Same ₹
                                        {Number(amount || 0).toLocaleString('en-IN')} &amp; payee as option 1.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-[#1f2937] border border-[#374151] px-2.5 py-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-gray-500">UPI ID (same for both options)</p>
                                <p className="text-white font-mono text-xs sm:text-sm break-all leading-snug">{displayUpi}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(displayUpi);
                                    setSuccess('Copied');
                                    setTimeout(() => setSuccess(''), 1500);
                                }}
                                className="shrink-0 px-2.5 py-1.5 rounded-md bg-[#1a74e5] text-white text-xs font-bold"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[10px] sm:text-[11px] text-[#1a74e5]/90 font-semibold">
                        Then submit proof (required for both ways)
                    </p>

                    {/* Proof — compact */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-3 bg-[#111827] rounded-xl p-3 sm:p-4 border border-[#1a74e5]/35"
                    >
                        <h3 className="text-sm font-bold text-[#1a74e5]">3 · Proof</h3>
                        <p className="text-[11px] text-gray-500 -mt-2 leading-snug">
                            12-digit UTR + payment screenshot required after you pay (app or QR).
                        </p>
                        <div>
                            <label className="block text-gray-300 text-xs font-medium mb-1">
                                UTR <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={upiTransactionId}
                                onChange={(e) => setUpiTransactionId(e.target.value)}
                                placeholder="12-digit UTR"
                                inputMode="numeric"
                                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1a74e5]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-xs font-medium mb-1">
                                Screenshot <span className="text-red-400">*</span>{' '}
                                <span className="text-amber-200/80 font-normal">required</span>
                            </label>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                                id="screenshot-upload"
                            />
                            <label
                                htmlFor="screenshot-upload"
                                className={`block w-full rounded-lg border border-dashed border-[#4b5563] bg-[#1f2937] cursor-pointer hover:border-[#6b7280] overflow-hidden ${
                                    screenshotPreview ? '' : 'min-h-[100px] sm:min-h-[110px]'
                                }`}
                            >
                                {screenshotPreview ? (
                                    <div className="w-full flex items-center justify-center p-2 md:p-3 min-h-[140px] md:min-h-[200px] bg-[#0f172a]/80">
                                        <img
                                            src={screenshotPreview}
                                            alt="Payment screenshot preview"
                                            className="max-w-full w-auto h-auto max-h-[200px] md:max-h-[min(360px,50vh)] object-contain rounded-md block"
                                            decoding="async"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center min-h-[100px] sm:min-h-[110px] px-2 py-4">
                                        <span className="text-[11px] text-gray-400 text-center">
                                            Tap to add success screen · JPG/PNG/WebP · max 5MB
                                        </span>
                                    </div>
                                )}
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-[#1a74e5] hover:bg-[#155fc2] text-white text-sm font-bold disabled:opacity-50"
                        >
                            {loading ? 'Submitting…' : 'Submit deposit'}
                        </button>
                    </form>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111827] rounded-2xl max-w-sm w-full p-6 border-2 border-green-300 text-center shadow-xl">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
                        
                        <div className="bg-green-50 rounded-xl p-4 mb-4 border-2 border-green-200">
                            <p className="text-gray-300 text-sm">Amount</p>
                            <p className="text-2xl font-bold text-green-600">₹{submittedAmount.toLocaleString()}</p>
                        </div>

                        <p className="text-gray-300 text-sm mb-6">
                            Your deposit request has been submitted successfully.
                            {depositSource === 'bookie'
                                ? ' Please wait for your agent to approve. Usually takes 15–30 minutes.'
                                : ' Please wait for admin approval. Usually takes 15–30 minutes.'}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Done
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    // Navigate to history - this will be handled by parent
                                    window.location.href = '/funds?tab=add-fund-history';
                                }}
                                className="w-full py-3 bg-[#1f2937] hover:bg-[#374151] text-[#1a74e5] font-medium rounded-xl border-2 border-[#374151] transition-colors"
                            >
                                View History
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddFund;
