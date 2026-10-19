import { CONSUMER_NON_PERSISTED_FEATURES } from '@flama/frontend-consumer/react';
import { createQueryPersistOptions } from '@flama/frontend-core/react';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ChromeStorageService } from '@/runtime/storage';

/**
 * The query cache, persisted to `chrome.storage.local`.
 *
 * The popup is a page that lives for seconds and is rebuilt from nothing
 * every time the toolbar button is pressed. Restoring the last answers from
 * storage is what lets it draw the account and the list at once and refetch
 * behind them, rather than open on a spinner every time. The side panel and
 * the options page read the same cache, so whichever opened last warms the
 * others.
 *
 * The rules are the web app's (`createQueryPersistOptions`): the session and
 * the consumer's sensitive features never reach storage, a cache written for
 * another user is dropped on restore, and a release (the version) starts
 * clean.
 */
const cacheStorage = new ChromeStorageService('query:');

export const queryPersistOptions = {
  persister: createAsyncStoragePersister({
    storage: {
      getItem: (key) => cacheStorage.get(key),
      setItem: (key, value) => cacheStorage.set(key, value),
      removeItem: (key) => cacheStorage.remove(key),
    },
    key: 'flama.query-cache',
  }),
  ...createQueryPersistOptions(__APP_VERSION__, {
    nonPersistedFeatures: CONSUMER_NON_PERSISTED_FEATURES,
  }),
};
