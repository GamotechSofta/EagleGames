import React, { useEffect } from 'react';

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_CONTAINER_ID = 'google_translate_element';
export const LANGUAGE_STORAGE_KEY = 'site_lang';
export const LANGUAGE_OPTIONS = [
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

const setLangCookies = (lang) => {
  document.cookie = `googtrans=/en/${lang};path=/`;
  document.cookie = `googtrans=/en/${lang};domain=${window.location.hostname};path=/`;
};

const triggerTranslateTo = (lang) => {
  const combo = document.querySelector('.goog-te-combo');
  if (!combo) return false;
  combo.value = lang;
  combo.dispatchEvent(new Event('change'));
  return true;
};

export const applyLanguage = (lang) => {
  setLangCookies(lang);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

  // Translate immediately when widget is ready.
  if (triggerTranslateTo(lang)) return;

  // Widget can appear late on mobile; retry briefly, then fallback to reload.
  let attempts = 0;
  const maxAttempts = 10;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (triggerTranslateTo(lang) || attempts >= maxAttempts) {
      window.clearInterval(timer);
      if (attempts >= maxAttempts) {
        window.location.reload();
      }
    }
  }, 200);
};

export const getCurrentLanguage = () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';

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
    if (storedLang) {
      setLangCookies(storedLang);
      // Apply selected language without forcing a hard reload.
      window.setTimeout(() => {
        triggerTranslateTo(storedLang);
      }, 600);
    }

    const barCleanupInterval = window.setInterval(hideTranslateTopBar, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(barCleanupInterval);
    };
  }, []);

  return <div id={GOOGLE_TRANSLATE_CONTAINER_ID} className="hidden" />;
};

export default GoogleTranslateWidget;
