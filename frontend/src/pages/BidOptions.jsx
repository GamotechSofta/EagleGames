import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isBettingAllowed } from '../utils/marketTiming';
import { useLanguage } from '../context/LanguageContext';
import { getMarketDisplayName } from '../utils/marketDisplayName';

/** English canonical titles — must match `GameBid` `BID_COMPONENTS` keys via `.toLowerCase()`. */
const OPTION_SPECS = [
  {
    id: 1,
    titleEn: 'Single Digit',
    labelKey: 'bidopt_singleDigit',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singledice_dizkld.png',
  },
  {
    id: 2,
    titleEn: 'Single Digit Bulk',
    labelKey: 'bidopt_singleDigitBulk',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singledice_dizkld.png',
  },
  {
    id: 2.5,
    titleEn: 'Odd Even',
    labelKey: 'bidopt_oddEven',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singledice_dizkld.png',
  },
  {
    id: 3,
    titleEn: 'Jodi',
    labelKey: 'bidopt_jodi',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doubledice_ermh5e.png',
  },
  {
    id: 4,
    titleEn: 'Jodi Bulk',
    labelKey: 'bidopt_jodiBulk',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doubledice_ermh5e.png',
  },
  {
    id: 5,
    titleEn: 'Single Pana',
    labelKey: 'bidopt_singlePana',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singlepatti_yyjv8d.png',
  },
  {
    id: 6,
    titleEn: 'Single Pana Bulk',
    labelKey: 'bidopt_singlePanaBulk',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singlepatti_yyjv8d.png',
  },
  {
    id: 6.5,
    titleEn: 'SP Common',
    labelKey: 'bidopt_spCommon',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singlepatti_yyjv8d.png',
  },
  {
    id: 6.6,
    titleEn: 'DP Common',
    labelKey: 'bidopt_dpCommon',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doublepatti_ckgt10.png',
  },
  {
    id: 6.55,
    titleEn: 'CP (Common Pana)',
    labelKey: 'bidopt_cpCommonPana',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singlepatti_yyjv8d.png',
  },
  {
    id: 7,
    titleEn: 'Double Pana',
    labelKey: 'bidopt_doublePana',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doublepatti_ckgt10.png',
  },
  {
    id: 8,
    titleEn: 'Double Pana Bulk',
    labelKey: 'bidopt_doublePanaBulk',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doublepatti_ckgt10.png',
  },
  {
    id: 9,
    titleEn: 'Triple Pana',
    labelKey: 'bidopt_triplePana',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/triplePatti_pnq1xp.png',
  },
  {
    id: 9.5,
    titleEn: 'Triple Pana Bulk',
    labelKey: 'bidopt_triplePanaBulk',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/triplePatti_pnq1xp.png',
  },
  {
    id: 10,
    titleEn: 'Full Sangam',
    labelKey: 'bidopt_fullSangam',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/fullSangam_nb6jy6.png',
  },
  {
    id: 11,
    titleEn: 'Half Sangam',
    labelKey: 'bidopt_halfSangam',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/halfSangam_qvd3yr.png',
  },
  {
    id: 12,
    titleEn: 'SP Motor',
    labelKey: 'bidopt_spMotor',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singlepatti_yyjv8d.png',
  },
  {
    id: 13,
    titleEn: 'DP Motor',
    labelKey: 'bidopt_dpMotor',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doublepatti_ckgt10.png',
  },
  {
    id: 14,
    titleEn: 'SP DP Motor',
    labelKey: 'bidopt_spDpMotor',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/doublepatti_ckgt10.png',
  },
  {
    id: 15,
    titleEn: 'SP DP T Motor',
    labelKey: 'bidopt_spDpTMotor',
    img: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804007/triplePatti_pnq1xp.png',
  },
];

const STARLINE_ALLOWED_TITLES = new Set(
  [
    'Single Digit',
    'Single Digit Bulk',
    'Odd Even',
    'SP Common',
    'CP (Common Pana)',
    'DP Common',
    'Single Pana',
    'Single Pana Bulk',
    'Double Pana',
    'Double Pana Bulk',
    'Triple Pana',
    'Half Sangam',
    'SP Motor',
    'DP Motor',
    'SP DP Motor',
    'SP DP T Motor',
  ]
);

const HIDE_WHEN_RUNNING = new Set(['jodi', 'jodi bulk', 'full sangam', 'half sangam']);

const OPTION_DISPLAY_ORDER = [
  'Single Digit',
  'Single Digit Bulk',
  'Jodi',
  'Jodi Bulk',
  'Single Pana',
  'Single Pana Bulk',
  'Double Pana',
  'Double Pana Bulk',
  'Triple Pana',
  'Triple Pana Bulk',
  'Half Sangam',
  'Full Sangam',
  'SP Common',
  'DP Common',
  'CP (Common Pana)',
  'SP Motor',
  'DP Motor',
  'SP DP Motor',
  'SP DP T Motor',
  'Odd Even',
];

const BidOptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const market = location.state?.market;
  const marketHeaderTitle = useMemo(
    () => getMarketDisplayName(market, language) || market?.gameName || market?.marketName || '',
    [market, language]
  );
  const marketType = (location.state?.marketType || '').toString().trim().toLowerCase();
  const inferredStarline = (() => {
    const t = marketType;
    if (t === 'starline' || t === 'startline' || t === 'star-line') return true;
    const mType = (market?.marketType || '').toString().trim().toLowerCase();
    if (mType === 'startline' || mType === 'starline') return true;
    const canonical = (market?.marketName || '').toString().toLowerCase();
    return canonical.includes('starline') || canonical.includes('startline') || canonical.includes('star line') || canonical.includes('start line');
  })();
  const isStarline = inferredStarline;

  // Redirect to home if no market (direct URL access or refresh)
  useEffect(() => {
    if (!market) {
      navigate('/', { replace: true });
      return;
    }
    if (isStarline && market?.status === 'closed') {
      navigate('/startline-dashboard', { replace: true });
    }
  }, [market, navigate, isStarline]);

  const options = useMemo(
    () =>
      OPTION_SPECS.map((spec) => ({
        id: spec.id,
        titleEn: spec.titleEn,
        labelKey: spec.labelKey,
        icon: (
          <img
            src={spec.img}
            alt={t(spec.labelKey)}
            className="w-full h-full object-contain"
          />
        ),
      })),
    [t]
  );

  if (!market) {
    return null; // Will redirect via useEffect
  }

  // Hide OPEN-only games once opening time has passed (close-only window).
  const timing = isBettingAllowed(market);
  const isCloseOnlyWindow = timing.allowed && timing.closeOnly === true;
  const isRunning = market.status === 'running' || isCloseOnlyWindow;
  const visibleOptionsBase = isStarline
    ? options.filter((opt) => STARLINE_ALLOWED_TITLES.has(opt.titleEn))
    : options;

  const visibleOptions = (!isStarline && isRunning)
    ? visibleOptionsBase.filter((opt) => {
        const key = opt.titleEn.toLowerCase().trim();
        return !HIDE_WHEN_RUNNING.has(key);
      })
    : visibleOptionsBase;

  const orderedVisibleOptions = [...visibleOptions].sort((a, b) => {
    const ia = OPTION_DISPLAY_ORDER.indexOf(a.titleEn);
    const ib = OPTION_DISPLAY_ORDER.indexOf(b.titleEn);
    const safeA = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const safeB = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return safeA - safeB;
  });

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-[#111827] border-b-2 border-[#374151] relative shadow-sm">
        <button
          onClick={() => navigate(isStarline ? '/startline-dashboard' : '/')}
          className="absolute left-3 sm:left-4 flex items-center justify-center min-w-[36px] min-h-[36px] -ml-1 text-gray-300 hover:text-[#1a74e5] active:scale-95 touch-manipulation"
          aria-label={t('bidopt_backAria')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="w-full text-center pr-12 pl-12 min-w-0">
          {/* Dynamic market name from selected market */}
          <h1 className="text-white font-bold text-sm sm:text-base tracking-wider uppercase inline-block border-b-2 border-[#1a74e5] pb-0.5 px-2 py-0.5 truncate max-w-full">
            {marketHeaderTitle || t('bidopt_selectMarket')}
          </h1>
          {isStarline ? (
            <div className="mt-2 text-xs font-extrabold tracking-[0.22em] text-[#1a74e5] uppercase">
              {t('bidopt_starlineMarket')}
            </div>
          ) : null}
        </div>
      </div>

      {/* Grid Content */}
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-7xl mx-auto px-2.5 sm:px-4 pt-4 sm:pt-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {orderedVisibleOptions.map((option) => (
          <div
            key={option.id}
            onClick={() => navigate('/game-bid', {
              state: {
                market,
                betType: option.titleEn,
                gameMode: option.titleEn.toLowerCase().includes('bulk') ? 'bulk' : 'easy'
              }
            })}
            className="relative aspect-square rounded-2xl bg-gradient-to-b from-[#2B3547] to-[#232C3B] border border-[#374151] p-2.5 sm:p-3 flex flex-col items-center justify-center gap-2 hover:border-[#4a5f87] active:scale-[0.98] transition-all cursor-pointer shadow-md hover:shadow-lg group touch-manipulation"
          >
            {/* Icon Container with subtle glow effect */}
            <div className="flex items-center justify-center w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] md:w-[88px] md:h-[88px] group-hover:scale-[1.03] transition-transform duration-300">
              {option.icon}
            </div>

            {/* Title */}
            <span className="text-white text-[10px] sm:text-[11px] md:text-[12px] font-bold tracking-[0.06em] sm:tracking-[0.08em] uppercase text-center line-clamp-2 leading-tight">
              {t(option.labelKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BidOptions;
