import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core/di';
import { ChromeStorageService } from '@/runtime/storage';
import { apiBaseUrl, extensionAuthClient } from './auth-client';

/**
 * The kernel, one per extension page. The popup, the side panel and the
 * options page each build their own — they are separate documents — and
 * agree through what they share: the cookie jar, `chrome.storage` and the
 * `session/changed` message. The service worker builds none.
 */
export const app = FlamaApp.create({
  // Never same-origin: an extension page's origin is chrome-extension://.
  apiBaseUrl,
  storage: new ChromeStorageService(),
  authClient: extensionAuthClient,
  modules: [
    // Loading the consumer product's modules is what makes this app that product.
    ...consumerModules,
  ],
});
