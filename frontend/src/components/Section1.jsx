import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const Section1 = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const [closedModal, setClosedModal] = useState({ open: false, marketName: '' });
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Convert 24-hour time to 12-hour format
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Status: result format OR automatic close when closing time is reached
  // ***-**-*** → Open (green) | 156-2*-*** → Running (green) | 987-45-456 or past closing time → Closed (red)
  const getMarketStatus = (market) => {
    if (isPastClosingTime(market)) {
      return { status: 'closed', timer: null };
    }
    const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
    const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));

    if (hasOpening && hasClosing) {
      return { status: 'closed', timer: null };
    }
    if (hasOpening && !hasClosing) {
      return { status: 'running', timer: null };
    }
    return { status: 'open', timer: null };
  };

  // Fetch markets from API
  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/markets/get-markets`);
      const data = await response.json();

      if (data.success) {
        const mainOnly = (data.data || []).filter((m) => m.marketType !== 'startline');
        const transformedMarkets = mainOnly.map((market) => {
          const st = getMarketStatus(market);
          return {
            id: market._id,
            gameName: market.marketName,
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            status: st.status,
            timer: st.timer,
            winNumber: market.winNumber,
            startingTime: market.startingTime,
            closingTime: market.closingTime,
            betClosureTime: market.betClosureTime ?? 0,
            openingNumber: market.openingNumber,
            closingNumber: market.closingNumber
          };
        });
        setMarkets(transformedMarkets);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const dataInterval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  useRefreshOnMarketReset(fetchMarkets);

  const handleMarketClick = (market, isClickable) => {
    if (isClickable) {
      navigate('/bidoptions', { state: { market } });
      return;
    }
    setClosedModal({ open: true, marketName: market.gameName || 'This market' });
  };


  return (
    <section className="w-full bg-transparent min-[375px]:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 sm:pb-10 min-[375px]:px-3 sm:px-4 md:pb-8 max-w-full overflow-x-hidden">
      {/* ═══ Desktop: MARKETS header ── */}
      <div className="hidden md:flex items-center gap-4 mt-4 mb-5 w-full max-w-7xl mx-auto px-4">
        {/* ── Left navy line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#374151] via-[#1a74e5] to-[#1a74e5] min-w-[20px]" />

        {/* ── MARKETS center ── */}
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-2.5 h-2.5 text-[#1a74e5]" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
          <h2 className="text-white text-lg font-bold tracking-[0.15em] uppercase">Markets</h2>
          <svg className="w-2.5 h-2.5 text-[#1a74e5]" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
        </div>

        {/* ── Right navy line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-l from-[#374151] via-[#1a74e5] to-[#1a74e5] min-w-[20px]" />

      </div>

      {/* ═══ Mobile: MARKETS Header - + MARKETS + with lines ═══ */}
      <div className="flex md:hidden items-center justify-center gap-2 min-[375px]:gap-3 mb-4 min-[375px]:mb-6 sm:mb-8 w-full max-w-7xl mx-auto px-2">
        <div className="flex-1 h-[1px] bg-gray-400 min-w-[20px] shrink-0 shadow-sm" />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[#1a74e5] font-bold text-sm min-[375px]:text-base sm:text-lg">+</span>
          <h2 className="text-[#1a74e5] font-bold text-sm min-[375px]:text-base sm:text-lg tracking-wider uppercase">MARKETS</h2>
          <span className="text-[#1a74e5] font-bold text-sm min-[375px]:text-base sm:text-lg">+</span>
        </div>
        <div className="flex-1 h-[1px] bg-gray-400 min-w-[20px] shrink-0 shadow-sm" />
      </div>
      {/* Market Cards Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-300">Loading markets...</p>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300">No markets available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 min-[375px]:gap-3 sm:gap-4">
          {markets.map((market) => {
            const isClickable = market.status === 'open' || market.status === 'running';
            const statusText = market.status === 'closed' ? 'Closed' : market.status === 'running' ? 'Running' : 'Open';
            return (
            <div
              key={market.id}
              onClick={() => handleMarketClick(market, isClickable)}
              className={`rounded-xl overflow-hidden transform transition-transform duration-200 shadow-md ${
                isClickable 
                  ? 'cursor-pointer hover:scale-[1.01] border border-[#2f3b52] hover:border-[#4f6a94]' 
                  : 'cursor-not-allowed border border-[#2f3b52]'
              }`}
            >
              <div className={`${market.status === 'closed' ? 'bg-[#9b111e]' : 'bg-[#0fb44a]'} text-white text-[11px] sm:text-xs font-semibold text-center py-1.5`}>
                {statusText}
              </div>
              <div className="p-2 sm:p-2.5 flex flex-col bg-[#1f2a3f]">
                <div className="flex items-center gap-1 text-[10px] text-gray-300 mb-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{market.timeRange}</span>
                </div>

                <h3 className="text-white text-base sm:text-lg font-semibold truncate mb-1 leading-tight">
                  {market.gameName}
                </h3>

                <p className="text-[#5cc6ff] text-lg sm:text-xl font-bold tracking-wide leading-tight mb-1.5">
                  {market.result}
                </p>

                <div className="flex items-end justify-between gap-2 text-gray-300">
                  <div className="space-y-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight">Open Bids</p>
                    <p className="text-xs sm:text-sm font-semibold leading-tight">{formatTime(market.startingTime) || '-'}</p>
                  </div>
                  <div className="space-y-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight">Close Bids</p>
                    <p className="text-xs sm:text-sm font-semibold leading-tight">{formatTime(market.closingTime) || '-'}</p>
                  </div>
                  <div className="shrink-0 pl-0.5">
                    {isClickable ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate('/bidoptions', { state: { market } }); }}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#00d35a] flex items-center justify-center text-white hover:bg-[#00bc50] active:scale-95"
                        aria-label="Play"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#374151] flex items-center justify-center text-gray-300">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {closedModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-[#111827] border border-[#374151] shadow-2xl p-5 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center animate-pulse">
              <svg className="w-9 h-9 text-red-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-1">Market Closed</h3>
            <p className="text-gray-300 text-sm mb-5">
              <span className="font-semibold">{closedModal.marketName}</span> is closed right now.
            </p>
            <button
              type="button"
              onClick={() => setClosedModal({ open: false, marketName: '' })}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Section1;
