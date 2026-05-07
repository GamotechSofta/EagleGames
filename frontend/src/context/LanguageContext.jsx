import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGE_STORAGE_KEY } from '../constants/languages';
import playerEn from '../translations/playerEn';
import playerHi from '../translations/playerHi';
import playerMr from '../translations/playerMr';
import playerTe from '../translations/playerTe';
import playerTa from '../translations/playerTa';
import playerKn from '../translations/playerKn';
import playerMl from '../translations/playerMl';

const translations = {
  en: playerEn,
  hi: playerHi,
  mr: playerMr,
  te: playerTe,
  ta: playerTa,
  kn: playerKn,
  ml: playerMl,
};

const HTML_LANG = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
  te: 'te',
  ta: 'ta',
  kn: 'kn',
  ml: 'ml',
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && translations[saved]) return saved;
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    try {
      document.documentElement.lang = HTML_LANG[language] || 'en';
    } catch (_) {}
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (translations[lang]) setLanguage(lang);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = translations[language]?.[key] ?? translations.en[key] ?? key;
      if (vars && typeof s === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          s = s.split(`{{${k}}}`).join(String(v ?? ''));
        });
      }
      return s;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
