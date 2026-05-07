import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ADMIN_LANGUAGE_STORAGE_KEY, ADMIN_LANG_CODES } from '../constants/languages';
import enTranslations from '../translations/en';
import hiTranslations from '../translations/hi';
import mrTranslations from '../translations/mr';
import teTranslations from '../translations/te';
import taTranslations from '../translations/ta';
import knTranslations from '../translations/kn';
import mlTranslations from '../translations/ml';

const HTML_LANG = {
    en: 'en',
    hi: 'hi',
    mr: 'mr',
    te: 'te',
    ta: 'ta',
    kn: 'kn',
    ml: 'ml',
};

const translations = {
    en: enTranslations,
    hi: hiTranslations,
    mr: mrTranslations,
    te: teTranslations,
    ta: taTranslations,
    kn: knTranslations,
    ml: mlTranslations,
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
        return saved && ADMIN_LANG_CODES.includes(saved) ? saved : 'en';
    });

    useEffect(() => {
        localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language);
        try {
            document.documentElement.lang = HTML_LANG[language] || 'en';
        } catch (_) {}
    }, [language]);

    const changeLanguage = useCallback((lang) => {
        if (ADMIN_LANG_CODES.includes(lang)) setLanguage(lang);
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
