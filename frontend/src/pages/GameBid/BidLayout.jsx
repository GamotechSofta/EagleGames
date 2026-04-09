import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBettingWindow } from './BettingWindowContext';

const getWalletFromStorage = () => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const val =
            u?.wallet ||
            u?.balance ||
            u?.points ||
            u?.walletAmount ||
            u?.wallet_amount ||
            u?.amount ||
            0;
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    } catch (e) {
        return 0;
    }
};

const BidLayout = ({
    market,
    title,
    children,
    bidsCount,
    totalPoints,
    showDateSession = true,
    extraHeader,
    session = 'OPEN',
    setSession = () => {},
    sessionRightSlot = null,
    showSessionOnMobile = false,
    sessionOptionsOverride = null,
    lockSessionSelect = false,
    hideSessionSelectCaret = false,
    dateSessionControlClassName = '',
    dateSessionGridClassName = '',
    footerRightOnDesktop = false,
    hideFooter = false,
    walletBalance,
    onSubmit = () => {},
    showFooterStats = true,
    submitLabel = 'Submit Bets',
    contentPaddingClass,
    selectedDate = null,
    setSelectedDate = null,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef(null);
    const dateInputRef = React.useRef(null);
    const { allowed: bettingAllowed, closeOnly: bettingCloseOnly, message: bettingMessage } = useBettingWindow();
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const [wallet, setWallet] = useState(() =>
        Number.isFinite(Number(walletBalance)) ? Number(walletBalance) : getWalletFromStorage()
    );
    
    const minDate = React.useMemo(() => {
        return new Date().toISOString().split('T')[0];
    }, []); 
    
    const [internalDate, setInternalDate] = React.useState(() => {
        try {
            const savedDate = localStorage.getItem('betSelectedDate');
            if (savedDate) {
                const today = new Date().toISOString().split('T')[0];
                if (savedDate > today) {
                    return savedDate;
                }
            }
        } catch (e) {}
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    
    const currentDate = selectedDate !== null ? selectedDate : internalDate;
    const setCurrentDate = setSelectedDate !== null ? setSelectedDate : (newDate) => {
        try {
            localStorage.setItem('betSelectedDate', newDate);
        } catch (e) {}
        setInternalDate(newDate);
    };

    useEffect(() => {
        if (currentDate !== minDate) setCurrentDate(minDate);
    }, [currentDate, minDate]);

    const marketStatus = market?.status;
    const isRunning = marketStatus === 'running';
    const isToday = currentDate === minDate;
    const isScheduled = currentDate > minDate;
    
    const sessionOptions =
        Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length
            ? sessionOptionsOverride
            : (isToday && (isRunning || bettingCloseOnly) ? ['CLOSE'] : ['OPEN', 'CLOSE']);

    useEffect(() => {
        if (Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length) {
            const desired = sessionOptionsOverride[0];
            if (desired && session !== desired) setSession(desired);
            return;
        }
        if (isToday && (isRunning || bettingCloseOnly) && session !== 'CLOSE') {
            setSession('CLOSE');
        }
    }, [isToday, isScheduled, isRunning, bettingCloseOnly, session, setSession, sessionOptionsOverride, sessionOptions, currentDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            if (document.documentElement) document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    useEffect(() => {
        const syncFromStorage = () => {
            const propWallet = Number(walletBalance);
            if (Number.isFinite(propWallet)) {
                setWallet(propWallet);
                return;
            }
            setWallet(getWalletFromStorage());
        };

        const onBalanceUpdated = (e) => {
            const next = Number(e?.detail?.balance);
            if (Number.isFinite(next)) {
                setWallet(next);
            } else {
                syncFromStorage();
            }
        };

        syncFromStorage();
        window.addEventListener('balanceUpdated', onBalanceUpdated);
        window.addEventListener('userLogin', syncFromStorage);
        window.addEventListener('storage', syncFromStorage);
        return () => {
            window.removeEventListener('balanceUpdated', onBalanceUpdated);
            window.removeEventListener('userLogin', syncFromStorage);
            window.removeEventListener('storage', syncFromStorage);
        };
    }, [walletBalance]);

    return (
        <div className="min-h-screen min-h-ios-screen bg-[#111827] font-sans w-full max-w-full overflow-x-hidden flex flex-col">
            {/* Header */}
            <div
                className="bg-[#374151] border-b-2 border-[#374151] py-1.5 flex items-center justify-between gap-2 sticky top-0 z-20 shadow-sm"
                style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
            >
                <button
                    onClick={() => market ? navigate('/bidoptions', { state: { market } }) : navigate(-1)}
                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition touch-manipulation"
                    aria-label="Back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide truncate flex-1 text-center mx-1 text-white min-w-0">
                    {market?.gameName ? `${market.gameName} - ${title}` : title}
                </h1>
                <div className="bg-[#4b5563] text-white px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] sm:text-sm font-bold shadow-md shrink-0 border-2 border-[#374151]">
                    <img
                        src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
                        alt="Wallet"
                        className="w-5 h-5 sm:w-5 sm:h-5 object-contain"
                    />
                    ₹{wallet.toFixed(1)}
                </div>
            </div>

            {!bettingAllowed && bettingMessage && (
                <div className="mx-3 sm:mx-6 mt-2 p-3 rounded-xl bg-red-50 border-2 border-red-300 text-red-600 text-sm font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {bettingMessage}
                </div>
            )}

            {showDateSession && (
                <div
                    className={`pt-1 pb-2 gap-1.5 md:pt-2 md:pb-4 md:gap-3 flex flex-row flex-wrap overflow-hidden ${dateSessionGridClassName}`}
                    style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
                >
                    <div className="relative flex-1 min-w-0 shrink overflow-hidden">
                        <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none z-10">
                            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <input
                            ref={dateInputRef}
                            type="text"
                            value={todayDate}
                            readOnly
                            className={`w-full pl-8 pr-2.5 py-1.5 min-h-[40px] h-[40px] sm:pl-10 sm:pr-3 sm:py-2.5 sm:min-h-[44px] sm:h-[44px] bg-[#111827] border-2 border-[#374151] text-white rounded-full text-xs sm:text-sm font-bold text-center focus:outline-none focus:border-[#1a74e5] cursor-pointer truncate ${dateSessionControlClassName}`}
                            style={{ colorScheme: 'light' }}
                            title="Current date"
                        />
                    </div>

                    <div className={`relative flex-1 min-w-0 ${showSessionOnMobile ? '' : 'hidden md:block'}`}>
                        <select
                            value={session}
                            onChange={(e) => setSession(e.target.value)}
                            disabled={lockSessionSelect || (isToday && isRunning)}
                            className={`w-full appearance-none bg-[#111827] border-2 border-[#374151] text-white font-bold text-xs sm:text-sm py-1.5 min-h-[40px] h-[40px] px-3 pr-7 sm:py-2.5 sm:min-h-[44px] sm:h-[44px] sm:px-4 sm:pr-8 rounded-full text-center focus:outline-none focus:border-[#1a74e5] ${(lockSessionSelect || (isToday && isRunning)) ? 'opacity-60 cursor-not-allowed bg-[#374151]' : ''} ${dateSessionControlClassName}`}
                        >
                            {sessionOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        {!hideSessionSelectCaret && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 sm:px-4 text-gray-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        )}
                    </div>
                    {sessionRightSlot}
                </div>
            )}
            {extraHeader}

            <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full ios-scroll-touch ${
                    contentPaddingClass ?? (hideFooter ? 'pb-6' : 'pb-32')
                }`}
                style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
            >
                {children}
            </div>

            {/* Footer - Positioned better for Reachability */}
            {!hideFooter && (
                <div
                    className="fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-0 right-0 md:bottom-0 z-30 py-2 md:grid md:grid-cols-2"
                    style={{
                        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
                        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
                    }}
                >
                    <div className="hidden md:block" />
                    <div className="flex justify-center">
                        <div
                            className={`w-full max-w-[350px] md:max-w-md rounded-2xl flex flex-row items-center gap-4 ${
                                showFooterStats
                                    ? 'bg-[#111827]/95 backdrop-blur-md border-2 border-[#374151] shadow-2xl px-4 py-2.5'
                                    : 'bg-transparent border-0 shadow-none p-0'
                            }`}
                        >
                            {showFooterStats && (
                                <div className="flex items-center gap-4 shrink-0 border-r border-[#374151] pr-4">
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-400 uppercase tracking-wider">Bets</div>
                                        <div className="text-sm font-bold text-[#1a74e5]">{bidsCount}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-gray-400 uppercase tracking-wider">Points</div>
                                        <div className="text-sm font-bold text-[#1a74e5]">{totalPoints}</div>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!bidsCount || !bettingAllowed}
                                className={`flex-1 font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all text-sm ${
                                    bidsCount && bettingAllowed
                                        ? 'bg-[#1a74e5] text-white active:scale-95'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BidLayout;