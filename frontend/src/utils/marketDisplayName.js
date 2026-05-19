import { MARKET_DISPLAY_FALLBACK } from '../translations/marketNamesFallback';

/** Maps English `marketName` to `player*.js` key `market_<slug>`. */
export function marketNameToI18nKey(canonicalEn) {
  const c = (canonicalEn || '').trim();
  if (!c) return '';
  const slug = c
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug ? `market_${slug}` : '';
}

function fallbackLabel(lang, canonicalEn) {
  const map = MARKET_DISPLAY_FALLBACK[lang];
  if (!map || !canonicalEn) return '';
  const c = canonicalEn.trim();
  if (map[c]) return map[c];
  const lower = c.toLowerCase();
  const key = Object.keys(map).find((k) => k.toLowerCase() === lower);
  return key ? map[key] : '';
}

/**
 * Localized market title for player UI (matches bookie `getMarketDisplayName`).
 * Uses admin `marketName*` fields, then API `name` (resolved for ?lang=), then optional `t` catalog keys `market_*`, then UI fallback map.
 * @param {((key: string) => string) | undefined} t - optional `useLanguage().t` for client-side market name catalog.
 */
export function getMarketDisplayName(market, language, t) {
  if (!market) return '';
  const lang = (language || 'en').toString().toLowerCase().split('-')[0];
  const pick = (v) => (v != null && String(v).trim() ? String(v).trim() : '');
  const canonical = pick(market.marketName);

  const ml = pick(market.marketNameMl ?? market.name_ml);
  const kn = pick(market.marketNameKn ?? market.name_kn);
  const ta = pick(market.marketNameTa ?? market.name_ta);
  const te = pick(market.marketNameTe ?? market.name_te);
  const mr = pick(market.marketNameMr ?? market.name_mr);
  const hi = pick(market.marketNameHi ?? market.name_hi);
  const en = canonical || pick(market.name);

  if (lang === 'ml' && ml) return ml;
  if (lang === 'kn' && kn) return kn;
  if (lang === 'ta' && ta) return ta;
  if (lang === 'te' && te) return te;
  if (lang === 'mr' && mr) return mr;
  if (lang === 'hi' && hi) return hi;

  // Backend applyLocalizedMarketFields sets `name` from ?lang= when DB has that locale.
  const resolved = pick(market.name);
  if (lang !== 'en' && resolved && canonical && resolved !== canonical) return resolved;

  if (typeof t === 'function') {
    const base = canonical || en;
    const i18nKey = marketNameToI18nKey(base);
    if (i18nKey) {
      const translated = t(i18nKey);
      if (translated && translated !== i18nKey) return translated;
    }
  }

  const fb = fallbackLabel(lang, canonical);
  if (fb) return fb;

  if (lang === 'en') return en || hi || mr || te || ta || kn || ml || '';
  return en || hi || mr || te || ta || kn || ml || '';
}
