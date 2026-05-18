/** Maps canonical English bet titles (from BidOptions / GameBid) to `bidopt_*` translation keys. */
export const BET_TYPE_TITLE_LABEL_KEYS = {
  'single digit': 'bidopt_singleDigit',
  'single digit bulk': 'bidopt_singleDigitBulk',
  'odd even': 'bidopt_oddEven',
  jodi: 'bidopt_jodi',
  'jodi bulk': 'bidopt_jodiBulk',
  'single pana': 'bidopt_singlePana',
  'single pana bulk': 'bidopt_singlePanaBulk',
  'sp common': 'bidopt_spCommon',
  'dp common': 'bidopt_dpCommon',
  'cp (common pana)': 'bidopt_cpCommonPana',
  'double pana': 'bidopt_doublePana',
  'double pana bulk': 'bidopt_doublePanaBulk',
  'triple pana': 'bidopt_triplePana',
  'triple pana bulk': 'bidopt_triplePanaBulk',
  'full sangam': 'bidopt_fullSangam',
  'half sangam': 'bidopt_halfSangam',
  'sp motor': 'bidopt_spMotor',
  'dp motor': 'bidopt_dpMotor',
  'sp dp motor': 'bidopt_spDpMotor',
  'sp dp t motor': 'bidopt_spDpTMotor',
};

/** Localized bet type title for game-bid header (English `title` from navigation is the lookup key). */
export function getBetTypeDisplayTitle(t, titleEn) {
  const raw = (titleEn ?? '').toString().trim();
  if (!raw) return '';
  const key = BET_TYPE_TITLE_LABEL_KEYS[raw.toLowerCase()];
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return raw;
}
