import { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getMarketDisplayName } from '../utils/marketDisplayName';

/** Localized market name for bet UI; falls back to gameName / marketName / bid type title. */
export function useMarketBetContextTitle(market, bidTypeTitle) {
  const { language } = useLanguage();
  return useMemo(() => {
    const localized = getMarketDisplayName(market, language);
    if (localized) return localized;
    const g = market?.gameName;
    if (g != null && String(g).trim()) return String(g).trim();
    const m = market?.marketName;
    if (m != null && String(m).trim()) return String(m).trim();
    return bidTypeTitle != null ? String(bidTypeTitle) : '';
  }, [market, language, bidTypeTitle]);
}
