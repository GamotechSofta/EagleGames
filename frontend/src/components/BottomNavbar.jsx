import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      setTimeout(() => {
        const scrollableElements = document.querySelectorAll(
          '[class*="overflow-y-auto"], [class*="overflow-y-scroll"], [class*="overflow-auto"]'
        );
        scrollableElements.forEach((el) => {
          if (el && typeof el.scrollTop === 'number') el.scrollTop = 0;
        });
      }, 10);
    } catch (_) {}
  };

  const navItems = useMemo(
    () => [
      {
        id: 'my-bids',
        labelKey: 'nav_myBets',
        path: '/bids',
        icon: (
          <img
            src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777192/auction_ofhpps.png"
            alt=""
            className="w-6 h-6 object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        ),
      },
      {
        id: 'bank',
        labelKey: 'nav_bank',
        path: '/bank',
        icon: (
          <img
            src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777283/bank_il6uwi.png"
            alt=""
            className="w-6 h-6 object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        ),
      },
      {
        id: 'games',
        labelKey: 'nav_games',
        path: '/games',
        icon: (
          <svg
            className="w-6 h-6 text-gray-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 7.5h13.5A2.25 2.25 0 0121 9.75v4.5A2.25 2.25 0 0118.75 16.5H5.25A2.25 2.25 0 013 14.25v-4.5A2.25 2.25 0 015.25 7.5z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5v3M6.75 12h3M15.75 11.25h.008v.008h-.008v-.008zM17.25 12.75h.008v.008h-.008v-.008z" />
          </svg>
        ),
      },
      {
        id: 'home',
        labelKey: 'nav_home',
        path: '/',
        icon: (
          <img
            src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777716/home_pvawyw.png"
            alt=""
            className="w-6 h-6 object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        ),
        isCenter: true,
      },
      {
        id: 'funds',
        labelKey: 'nav_funds',
        path: '/funds',
        icon: (
          <img
            src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777500/funding_zjmbzp.png"
            alt=""
            className="w-6 h-6 object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        ),
      },
      {
        id: 'support',
        labelKey: 'nav_support',
        path: '/support',
        icon: (
          <img
            src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777618/customer-support_du0zcj.png"
            alt=""
            className="w-6 h-6 object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        ),
      },
    ],
    []
  );

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pt-1"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#66000000] to-[#111827] pointer-events-none -mb-20" />
      <div className="relative bg-[#111827] rounded-3xl border border-[#374151] shadow-lg flex items-end justify-around px-1 py-1.5 min-h-[56px]">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.path === '/' && location.pathname === '/') {
                    scrollToTop();
                    return;
                  }
                  navigate(item.path);
                }}
                className="flex flex-col items-center justify-center -mt-6 relative z-10 active:scale-90 transition-transform duration-150 touch-manipulation"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                    active
                      ? 'bg-[#1a74e5] ring-2 ring-[#1a74e5]/40 ring-offset-2 ring-offset-[#1f2937] scale-105'
                      : 'bg-[#1f2937] border border-[#374151]'
                  }`}
                >
                  <div
                    className={`transition-all duration-200 ${
                      active ? 'brightness-0 invert opacity-100' : 'brightness-0 invert opacity-75'
                    }`}
                  >
                    {item.icon}
                  </div>
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-bold mt-1 transition-colors duration-200 ${
                    active ? 'text-[#1a74e5]' : 'text-gray-400'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.path === '/' && location.pathname === '/') {
                  scrollToTop();
                  return;
                }
                navigate(item.path);
              }}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] active:scale-95 transition-all duration-150 touch-manipulation"
            >
              <div
                className={`transition-all duration-200 ${
                  active ? 'scale-110 brightness-0 invert opacity-100' : 'scale-100 brightness-0 invert opacity-75'
                }`}
              >
                {item.icon}
              </div>
              <div className="h-1.5 w-full flex items-center justify-center">
                {active && <div className="w-1.5 h-1.5 rounded-full bg-[#1a74e5] shadow-md mx-auto" />}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold transition-colors duration-200 ${
                  active ? 'text-[#1a74e5]' : 'text-gray-400'
                }`}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavbar;
