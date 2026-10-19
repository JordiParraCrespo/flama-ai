import type { TFunction } from 'i18next';
import { MessageError } from '@/runtime/messaging';

/** The host a clip came from, without `www.` — what a person recognises a site by. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * The words for a failed save. The service worker says why in a code
 * (`SAVE_ERRORS` in `background/save-tab.ts`); a page that is closed to
 * extensions gets its own sentence, anything else the generic one.
 */
export function saveErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof MessageError && error.code === 'restricted') {
    return t('extension.page.restricted');
  }
  return t('extension.page.failed');
}
