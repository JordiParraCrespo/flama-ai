import { defaultLocale, defaultNS, type Locale, locales, resources } from '@flama/translations';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/** SecureStore key used to persist the user's language choice. */
export const LOCALE_STORAGE_KEY = 'flama.locale';

function isSupported(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Best-effort device language, falling back to the default locale. */
function getDeviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return isSupported(code) ? code : defaultLocale;
}

i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: getDeviceLocale(),
  fallbackLng: defaultLocale,
  supportedLngs: [...locales],
  interpolation: {
    // React already escapes values, so i18next must not double-escape.
    escapeValue: false,
  },
});

// Apply a previously persisted choice once SecureStore resolves.
SecureStore.getItemAsync(LOCALE_STORAGE_KEY)
  .then((stored) => {
    if (isSupported(stored) && stored !== i18n.language) {
      return i18n.changeLanguage(stored);
    }
  })
  .catch(() => {
    // Ignore storage errors and keep the detected locale.
  });

/** Change the active language and persist it for future launches. */
export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale);
}

export default i18n;
