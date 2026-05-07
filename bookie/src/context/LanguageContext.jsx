import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../translations/en';
import hiTranslations from '../translations/hi';
import mrTranslations from '../translations/mr';
import teTranslations from '../translations/te';
import taTranslations from '../translations/ta';
import knTranslations from '../translations/kn';
import mlTranslations from '../translations/ml';
import { BOOKIE_LANG_CODES } from '../constants/languages';

const LanguageContext = createContext();

const translations = {
    en: enTranslations,
    hi: hiTranslations,
    mr: mrTranslations,
    te: teTranslations,
    ta: taTranslations,
    kn: knTranslations,
    ml: mlTranslations,
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const savedLanguage = localStorage.getItem('bookie_language');
        return savedLanguage && BOOKIE_LANG_CODES.includes(savedLanguage) ? savedLanguage : 'en';
    });

    useEffect(() => {
        localStorage.setItem('bookie_language', language);
    }, [language]);

    const t = (key) => {
        return translations[language]?.[key] || translations.en[key] || key;
    };

    const changeLanguage = (lang) => {
        if (BOOKIE_LANG_CODES.includes(lang)) {
            setLanguage(lang);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
