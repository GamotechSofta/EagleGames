import React, { useEffect } from 'react';

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_CONTAINER_ID = 'google_translate_element';
const LANGUAGE_STORAGE_KEY = 'site_lang';
const LANGUAGE_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', label: 'മലയാളം (Malayalam)' },
];

const applyLanguage = (lang) => {
    document.cookie = `googtrans=/en/${lang};path=/`;
    document.cookie = `googtrans=/en/${lang};domain=${window.location.hostname};path=/`;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    window.location.reload();
};

const hideTranslateTopBar = () => {
    const selectors = [
        '.goog-te-banner-frame',
        '.goog-te-banner-frame.skiptranslate',
        '.skiptranslate iframe',
        '.VIpgJd-ZVi9od-ORHb-OEVmcd',
        '.VIpgJd-ZVi9od-aZ2wEe-wOHMyf',
    ];
    selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
            node.style.setProperty('display', 'none', 'important');
            node.style.setProperty('visibility', 'hidden', 'important');
            node.style.setProperty('height', '0', 'important');
        });
    });
    if (document.body) {
        document.body.style.setProperty('top', '0px', 'important');
    }
    if (document.documentElement) {
        document.documentElement.style.setProperty('top', '0px', 'important');
    }
};

const GoogleTranslateWidget = () => {
    useEffect(() => {
        const styleId = 'google-translate-cleanup-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .goog-te-banner-frame,
                .goog-te-banner-frame.skiptranslate,
                .VIpgJd-ZVi9od-ORHb-OEVmcd,
                .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
                .skiptranslate iframe {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                }
                body, html { top: 0 !important; }
                iframe.goog-te-menu-frame { z-index: 2147483647 !important; }
            `;
            document.head.appendChild(style);
        }
        hideTranslateTopBar();

        const observer = new MutationObserver(() => {
            hideTranslateTopBar();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.googleTranslateElementInit = () => {
            if (!window.google?.translate?.TranslateElement) return;
            const container = document.getElementById(GOOGLE_TRANSLATE_CONTAINER_ID);
            if (!container) return;
            if (container.childElementCount > 0) return;

            new window.google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,mr,gu,ta,te,bn,kn,ml',
                    autoDisplay: false,
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                },
                GOOGLE_TRANSLATE_CONTAINER_ID
            );
        };

        if (window.google?.translate?.TranslateElement) {
            window.googleTranslateElementInit();
            return;
        }

        if (!document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) {
            const script = document.createElement('script');
            script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        }

        const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang && storedLang !== 'en') {
            document.cookie = `googtrans=/en/${storedLang};path=/`;
            document.cookie = `googtrans=/en/${storedLang};domain=${window.location.hostname};path=/`;
        }

        const barCleanupInterval = window.setInterval(hideTranslateTopBar, 500);

        return () => {
            observer.disconnect();
            window.clearInterval(barCleanupInterval);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-3 lg:right-6 z-[90] rounded-xl bg-white/95 shadow-lg border border-gray-200 px-3 py-2">
            <div id={GOOGLE_TRANSLATE_CONTAINER_ID} className="hidden" />
            <label className="block text-[11px] text-gray-500 mb-1">Language</label>
            <select
                className="w-44 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
                defaultValue={localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en'}
                onChange={(e) => applyLanguage(e.target.value)}
            >
                {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default GoogleTranslateWidget;
