import i18n from 'i18next';
import { Tolgee, DevTools, FormatSimple } from '@tolgee/react';

import en from '../../i18n/en.json';

void i18n.init({
  initImmediate: false,
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
} as any);

// Dynamic loader for deferred inactive locales to keep cold-start bundle lightweight
const loadLocaleResource = async (lang: string) => {
  switch (lang) {
    case 'es':
      return (await import('../../i18n/es.json')).default;
    case 'de':
      return (await import('../../i18n/de.json')).default;
    case 'fr':
      return (await import('../../i18n/fr.json')).default;
    case 'zh':
      return (await import('../../i18n/zh.json')).default;
    case 'pt':
      return (await import('../../i18n/pt.json')).default;
    case 'it':
      return (await import('../../i18n/it.json')).default;
    case 'ja':
      return (await import('../../i18n/ja.json')).default;
    case 'ko':
      return (await import('../../i18n/ko.json')).default;
    default:
      return {};
  }
};

export async function ensureLocaleLoaded(lang: string): Promise<void> {
  if (lang === 'en') return;
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    const data = await loadLocaleResource(lang);
    i18n.addResourceBundle(lang, 'translation', data, true, true);
    tolgee.addStaticData({ [lang]: data });
  }
}

export function getInitialLocale(): string {
  try {
    const raw =
      typeof window !== 'undefined' ? window.localStorage?.getItem('settings-storage-v1') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.settings?.language) {
        return parsed.state.settings.language;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
      return 'es';
    }
  } catch {
    /* noop */
  }
  return 'en';
}

// If startup language is not English, immediately kick off loading in the background
const initialLocale = getInitialLocale();
if (initialLocale !== 'en') {
  void ensureLocaleLoaded(initialLocale);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const staticData = {
  en,
  es: () => loadLocaleResource('es'),
  de: () => loadLocaleResource('de'),
  fr: () => loadLocaleResource('fr'),
  zh: () => loadLocaleResource('zh'),
  pt: () => loadLocaleResource('pt'),
  it: () => loadLocaleResource('it'),
  ja: () => loadLocaleResource('ja'),
  ko: () => loadLocaleResource('ko'),
} as any;

const tolgeeConfig: Parameters<ReturnType<typeof Tolgee>['init']>[0] = {
  staticData,
  defaultLanguage: 'en',
  availableLanguages: ['en', 'es', 'de', 'fr', 'zh', 'pt', 'it', 'ja', 'ko'],
};

const apiKey = import.meta.env.VITE_APP_TOLGEE_API_KEY as string | undefined;
if (apiKey) {
  tolgeeConfig.apiKey = apiKey;
  tolgeeConfig.apiUrl =
    (import.meta.env.VITE_APP_TOLGEE_API_URL as string | undefined) ?? 'https://app.tolgee.io';
}

export const tolgee = Tolgee().use(DevTools()).use(FormatSimple()).init(tolgeeConfig);

// Defer running tolgee active listeners/translators to clear JS thread during start
setTimeout(() => {
  void tolgee.run();
}, 4000);

export default i18n;
