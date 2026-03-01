/**
 * Safe360 — Language Auto-Detection
 * Priority: localStorage → IP Geolocation → navigator.language → 'en'
 */

export type Language = 'pt' | 'ptPT' | 'en' | 'enGB' | 'es' | 'it' | 'zh' | 'fr' | 'de' | 'uk';

const STORAGE_KEY = 'safe360_language';

const ALL_LANGUAGES: Language[] = ['pt', 'ptPT', 'en', 'enGB', 'es', 'it', 'zh', 'fr', 'de', 'uk'];

function isValidLanguage(val: string): val is Language {
  return ALL_LANGUAGES.includes(val as Language);
}

// ─── localStorage ───

export function getPersistedLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLanguage(stored)) return stored;
  } catch {}
  return null;
}

export function persistLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

// ─── HTML lang attribute mapping ───

export const HTML_LANG_MAP: Record<Language, string> = {
  pt: 'pt-BR',
  ptPT: 'pt-PT',
  en: 'en-US',
  enGB: 'en-GB',
  es: 'es',
  it: 'it',
  zh: 'zh-CN',
  fr: 'fr',
  de: 'de',
  uk: 'uk',
};

// ─── Country → Language mapping ───

const COUNTRY_TO_LANGUAGE: Record<string, Language> = {
  // Portuguese (Brazil)
  BR: 'pt',
  // Portuguese (Portugal + CPLP)
  PT: 'ptPT', AO: 'ptPT', MZ: 'ptPT', CV: 'ptPT', GW: 'ptPT', ST: 'ptPT', TL: 'ptPT',
  // English (USA)
  US: 'en', CA: 'en', PH: 'en',
  // English (UK)
  GB: 'enGB', AU: 'enGB', NZ: 'enGB', IE: 'enGB', ZA: 'enGB', IN: 'enGB',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', UY: 'es', PY: 'es', BO: 'es', CR: 'es', PA: 'es', DO: 'es',
  GT: 'es', HN: 'es', SV: 'es', NI: 'es', CU: 'es', PR: 'es',
  // Italian
  IT: 'it', SM: 'it',
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',
  // French
  FR: 'fr', BE: 'fr', SN: 'fr', CI: 'fr', ML: 'fr', CM: 'fr', CD: 'fr',
  MG: 'fr', HT: 'fr', LU: 'fr', MC: 'fr',
  // German
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // Ukrainian
  UA: 'uk',
};

// ─── Browser language mapping ───

const BROWSER_LANG_MAP: Record<string, Language> = {
  'pt-BR': 'pt', 'pt-PT': 'ptPT', 'pt': 'pt',
  'en-US': 'en', 'en-GB': 'enGB', 'en-AU': 'enGB', 'en': 'en',
  'es': 'es', 'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es',
  'it': 'it', 'it-IT': 'it',
  'zh': 'zh', 'zh-CN': 'zh', 'zh-TW': 'zh', 'zh-Hans': 'zh', 'zh-Hant': 'zh',
  'fr': 'fr', 'fr-FR': 'fr', 'fr-BE': 'fr', 'fr-CA': 'fr',
  'de': 'de', 'de-DE': 'de', 'de-AT': 'de', 'de-CH': 'de',
  'uk': 'uk', 'uk-UA': 'uk',
};

function detectFromBrowser(): Language {
  try {
    const browserLang = navigator.language || '';
    if (BROWSER_LANG_MAP[browserLang]) return BROWSER_LANG_MAP[browserLang];
    const prefix = browserLang.split('-')[0];
    if (BROWSER_LANG_MAP[prefix]) return BROWSER_LANG_MAP[prefix];
  } catch {}
  return 'en';
}

// ─── IP Geolocation ───

export async function detectLanguageFromIP(): Promise<Language> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('IP API error');

    const data = await response.json();
    const countryCode: string = data.country_code || '';

    if (countryCode && COUNTRY_TO_LANGUAGE[countryCode]) {
      return COUNTRY_TO_LANGUAGE[countryCode];
    }
  } catch {
    // Silently fall through to browser detection
  }

  return detectFromBrowser();
}

// ─── Main resolver ───

export async function resolveInitialLanguage(): Promise<Language> {
  const persisted = getPersistedLanguage();
  if (persisted) return persisted;

  return detectLanguageFromIP();
}
