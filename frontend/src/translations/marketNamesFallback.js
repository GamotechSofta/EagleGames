/**
 * Optional labels when admin has not set marketNameHi / marketNameMr / … in DB.
 * Keys should match English `marketName` (case-insensitive lookup at runtime).
 */
const DEVANAGARI = {
  Kalyan: 'कल्याण',
  'Karnataka Day': 'कर्नाटक डे',
  'Karnataka Night': 'कर्नाटक नाइट',
  Sridevi: 'श्रीदेवी',
  'Sridevi Night': 'श्रीदेवी नाइट',
  'Friendship Day': 'फ्रेंडशिप डे',
  'Friendship Night': 'फ्रेंडशिप नाइट',
  'Time Bazar': 'टाइम बाजार',
  'Madhur Day': 'मधुर डे',
  'Madhur Night': 'मधुर नाइट',
  'Milan Day': 'मिलन डे',
  'Milan Night': 'मिलन नाइट',
  'Rajdhani Day': 'राजधानी डे',
  'Rajdhani Night': 'राजधानी नाइट',
};

/** @type {Record<string, Record<string, string>>} */
export const MARKET_DISPLAY_FALLBACK = {
  hi: DEVANAGARI,
  mr: DEVANAGARI,
  te: {},
  ta: {},
  kn: {},
  ml: {},
};
