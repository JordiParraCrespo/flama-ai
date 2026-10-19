import { listen } from '@/runtime/messaging';
import { readSnapshot } from './snapshot';
import { showToast } from './toast';

/**
 * The content script. Nothing declares it in the manifest: the service worker
 * injects it into one tab, when the person asks, with the `activeTab` grant
 * that asking gives (`injectContentScript`). It runs in an isolated world —
 * the page's DOM, none of the page's JavaScript — and only answers.
 *
 * It can be injected into a page it already sits in, so the second copy
 * steps aside rather than answering every message twice.
 */
declare global {
  interface Window {
    __flamaContentScript?: true;
  }
}

if (!window.__flamaContentScript) {
  window.__flamaContentScript = true;

  listen({
    'page/snapshot': () => readSnapshot(document, window.getSelection()),
    'page/toast': (toast) => {
      showToast(toast);
      return undefined;
    },
  });
}
