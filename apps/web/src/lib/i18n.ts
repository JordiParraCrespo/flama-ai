import { defaultLocale, defaultNS, locales, resources } from '@flama/translations';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

/** localStorage key used to persist the user's language choice. */
export const LOCALE_STORAGE_KEY = 'flama-locale';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: defaultLocale,
    supportedLngs: [...locales],
    interpolation: {
      // React already escapes values, so i18next must not double-escape.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
  });

export default i18n;
