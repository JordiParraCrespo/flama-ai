import en from './en/index.json';
import es from './es/index.json';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** Default i18next namespace used across apps. */
export const defaultNS = 'translation' as const;

/** Raw messages keyed by locale. */
export const messages = { en, es } as const;

/** Shape of a single locale's message catalog (English is the source of truth). */
export type Messages = typeof en;

/**
 * Resources ready to be passed to `i18next.init({ resources })`.
 * Every locale is registered under the {@link defaultNS} namespace.
 */
export const resources = {
  en: { [defaultNS]: en },
  es: { [defaultNS]: es },
} as const;

export { en, es };
