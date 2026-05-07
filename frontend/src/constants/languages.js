/** JSON-based UI languages (no Google Translate). Must match translation files in ../translations/player*.js */
export const LANGUAGE_STORAGE_KEY = 'player_language';

/** Same ISO codes as admin (`ADMIN_LANG_CODES`) and bookie (`BOOKIE_LANG_CODES`). */
export const SUPPORTED_LANG_CODES = ['en', 'hi', 'mr', 'te', 'ta', 'kn', 'ml'];

export const LANGUAGE_OPTIONS = [  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
];
