import type { Messages } from '@flama/translations/locales';

/**
 * Copy for the parts of the extension React never renders: the context menu,
 * the in-page toast. They read `_locales/` through `chrome.i18n`, which the
 * build writes from `extension.chrome` in `@flama/translations` — so the keys
 * are typed against that catalog and a missing one is a compile error.
 *
 * `chrome.i18n` follows the browser's language, not the in-app choice the
 * pages make with i18next; the two agree for everyone who has not picked one.
 */
export type ChromeMessage = keyof Messages['extension']['chrome'];

export function chromeMessage(key: ChromeMessage): string {
  return chrome.i18n.getMessage(key) || key;
}
