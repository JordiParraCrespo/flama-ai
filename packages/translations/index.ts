import en from './en/index.json';
import es from './es/index.json';
import { defaultNS } from './locales';

/**
 * The eager barrel: importing anything from here pulls in *every* catalog.
 *
 * That is what the API (which renders email in whichever locale the recipient
 * chose) and the Expo apps (bundled ahead of time, no network) want. Browsers
 * want one catalog, so the web apps import metadata from
 * `@flama/translations/locales` and catalogs from `@flama/translations/lazy`
 * instead — see the note in `locales.ts`.
 */
export { defaultLocale, defaultNS, type Locale, locales, type Messages } from './locales';

/** Raw messages keyed by locale. */
export const messages = { en, es } as const;

/**
 * Resources ready to be passed to `i18next.init({ resources })`.
 * Every locale is registered under the {@link defaultNS} namespace.
 */
export const resources = {
  en: { [defaultNS]: en },
  es: { [defaultNS]: es },
} as const;

export { en, es };
