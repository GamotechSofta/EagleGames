import axios from 'axios';

/** Canonical English display name → localized labels aligned with frontend `player*.js` market_* keys. */
const KNOWN_MARKET_LOCALES = {
    Kalyan: {
        hi: 'कल्याण',
        mr: 'कल्याण',
        te: 'కల్యాణ్',
        ta: 'கல்யாண்',
        kn: 'ಕಲ್ಯಾಣ್',
        ml: 'കല്യാണ്',
    },
    'Karnataka Day': {
        hi: 'कर्नाटक डे',
        mr: 'कर्नाटक डे',
        te: 'కర్నాటక డే',
        ta: 'கர்நாடக நாள்',
        kn: 'ಕರ್ನಾಟಕ ಡೇ',
        ml: 'കർണാടക ദിനം',
    },
    'Karnataka Night': {
        hi: 'कर्नाटक नाइट',
        mr: 'कर्नाटक नाइट',
        te: 'కర్నాటక నైట్',
        ta: 'கர்நாடக இரவு',
        kn: 'ಕರ್ನಾಟಕ ನೈಟ್',
        ml: 'കർണാടക രാത്രി',
    },
    Sridevi: {
        hi: 'श्रीदेवी',
        mr: 'श्रीदेवी',
        te: 'శ్రీదేవి',
        ta: 'ஸ்ரீதேவி',
        kn: 'ಶ್ರೀದೇವಿ',
        ml: 'ശ്രീദേവി',
    },
    'Sridevi Night': {
        hi: 'श्रीदेवी नाइट',
        mr: 'श्रीदेवी नाइट',
        te: 'శ్రీదేవి నైట్',
        ta: 'ஸ்ரீதேவி இரவு',
        kn: 'ಶ್ರೀದೇವಿ ನೈಟ್',
        ml: 'ശ്രീദേവി രാത്രി',
    },
    'Friendship Day': {
        hi: 'फ्रेंडशिप डे',
        mr: 'फ्रेंडशिप डे',
        te: 'ఫ్రెండ్‌షిప్ డే',
        ta: 'நட்பு நாள்',
        kn: 'ಫ್ರೆಂಡ್‌ಶಿಪ್ ಡೇ',
        ml: 'ഫ്രണ്ട്ഷിപ്പ് ദിനം',
    },
    'Friendship Night': {
        hi: 'फ्रेंडशिप नाइट',
        mr: 'फ्रेंडशिप नाइट',
        te: 'ఫ్రెండ్‌షిప్ నైట్',
        ta: 'நட்பு இரவு',
        kn: 'ಫ್ರೆಂಡ್‌ಶಿಪ್ ನೈಟ್',
        ml: 'ഫ്രണ്ട്ഷിപ്പ് രാത്രി',
    },
    'Time Bazar': {
        hi: 'टाइम बाजार',
        mr: 'टाइम बाजार',
        te: 'టైం బజార్',
        ta: 'டைம் பசார்',
        kn: 'ಟೈಂ ಬಜಾರ್',
        ml: 'ടൈം ബസാർ',
    },
    'Madhur Day': {
        hi: 'मधुर डे',
        mr: 'मधुर डे',
        te: 'మధుర్ డే',
        ta: 'மதுர் நாள்',
        kn: 'ಮಧುರ್ ಡೇ',
        ml: 'മധുർ ദിനം',
    },
    'Madhur Night': {
        hi: 'मधुर नाइट',
        mr: 'मधुर नाइट',
        te: 'మధుర్ నైట్',
        ta: 'மதுர் இரவு',
        kn: 'ಮಧುರ್ ನೈಟ್',
        ml: 'മധുർ രാത്രി',
    },
    'Milan Day': {
        hi: 'मिलन डे',
        mr: 'मिलन डे',
        te: 'మిలాన్ డే',
        ta: 'மிலான் நாள்',
        kn: 'ಮಿಲನ್ ಡೇ',
        ml: 'മിലൻ ദിനം',
    },
    'Milan Night': {
        hi: 'मिलन नाइट',
        mr: 'मिलन नाइट',
        te: 'మిలాన్ నైట్',
        ta: 'மிலான் இரவு',
        kn: 'ಮಿಲನ್ ನೈಟ್',
        ml: 'മിലൻ രാത്രി',
    },
    'Rajdhani Day': {
        hi: 'राजधानी डे',
        mr: 'राजधानी डे',
        te: 'రాజధాని డే',
        ta: 'ராஜதானி நாள்',
        kn: 'ರಾಜಧಾನಿ ಡೇ',
        ml: 'രാജധാനി ദിനം',
    },
    'Rajdhani Night': {
        hi: 'राजधानी नाइट',
        mr: 'राजधानी नाइट',
        te: 'రాజధాని నైట్',
        ta: 'ராஜதானி இரவு',
        kn: 'ರಾಜಧಾನಿ ನೈಟ್',
        ml: 'രാജധാനി രാത്രി',
    },
};

const LOCALE_SPECS = [
    { field: 'marketNameHi', lang: 'hi' },
    { field: 'marketNameMr', lang: 'mr' },
    { field: 'marketNameTe', lang: 'te' },
    { field: 'marketNameTa', lang: 'ta' },
    { field: 'marketNameKn', lang: 'kn' },
    { field: 'marketNameMl', lang: 'ml' },
];

const catalogIndex = new Map();
for (const [en, row] of Object.entries(KNOWN_MARKET_LOCALES)) {
    catalogIndex.set(normalizeEnKey(en), row);
}

function normalizeEnKey(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** "Time Bazaar" → same bucket as "Time Bazar" */
const EN_ALIASES = [
    [/bazaar/gi, 'bazar'],
    [/  +/g, ' '],
];

function normalizeForCatalogLookup(base) {
    let s = normalizeEnKey(base);
    for (const [re, rep] of EN_ALIASES) {
        s = s.replace(re, rep);
    }
    return s.trim();
}

function catalogRowForEnglish(baseEn) {
    const key = normalizeForCatalogLookup(baseEn);
    return catalogIndex.get(key) || null;
}

async function translateWithLingva(text, lang) {
    const q = String(text || '').trim();
    if (!q) return null;
    const url = `https://lingva.ml/api/v1/en/${encodeURIComponent(lang)}/${encodeURIComponent(q)}`;
    try {
        const { data } = await axios.get(url, { timeout: 12000, validateStatus: () => true });
        const t = data?.translation;
        return t && String(t).trim() ? String(t).trim() : null;
    } catch {
        return null;
    }
}

/**
 * Resolve `marketNameHi` … `marketNameMl` for create/update.
 * - Explicit body fields always win (including null when cleared).
 * - Omitted fields: on create, or when English name changed, or when no saved value — fill from catalog or Lingva.
 */
export async function resolveMarketLocalesForSave({ body, finalEnglishName, existingMarket }) {
    const base = String(finalEnglishName || '').trim();
    const out = {};
    if (!base) return out;

    const prevEn = existingMarket?.marketName != null ? String(existingMarket.marketName).trim() : '';
    const nameChanged = !existingMarket || base !== prevEn;
    const catalog = catalogRowForEnglish(base);

    const tasks = [];
    for (const { field, lang } of LOCALE_SPECS) {
        const hasExplicit = Object.prototype.hasOwnProperty.call(body, field);
        if (hasExplicit) {
            const raw = body[field];
            out[field] =
                raw !== undefined && raw !== null && String(raw).trim() ? String(raw).trim() : null;
            continue;
        }

        const prev = existingMarket?.[field] != null ? String(existingMarket[field]).trim() : '';
        if (prev && !nameChanged) continue;

        const fromCat = catalog?.[lang];
        if (fromCat && String(fromCat).trim()) {
            out[field] = String(fromCat).trim();
            continue;
        }
        tasks.push(
            (async () => {
                const t = await translateWithLingva(base, lang);
                if (t) out[field] = t;
            })()
        );
    }

    if (tasks.length) await Promise.all(tasks);
    return out;
}
