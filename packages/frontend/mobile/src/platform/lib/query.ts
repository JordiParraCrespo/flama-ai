import {
  createQueryPersistOptions,
  defaultQueryClientOptions,
  type QueryPersistConfig,
} from '@flama/frontend-core/react';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

/**
 * A query client whose cache is written to MMKV, so a relaunch renders from
 * cache. A cold start is the common case on mobile, so lists are worth
 * keeping for a few minutes before refetching.
 *
 * Sensitive features are filtered out of storage by `createQueryPersistOptions`;
 * the app names its product's (`CONSUMER_NON_PERSISTED_FEATURES`) through
 * `nonPersistedFeatures`. Tokens never come near this: they stay in
 * expo-secure-store.
 */
export function createQueryPersistence(config: QueryPersistConfig = {}) {
  followAppState();

  const queryClient = new QueryClient({
    defaultOptions: defaultQueryClientOptions(1000 * 60 * 5),
  });

  const queryCache = createMMKV({ id: 'flama.query-cache' });

  const persister = createAsyncStoragePersister({
    storage: {
      getItem: (key) => queryCache.getString(key) ?? null,
      setItem: (key, value) => {
        queryCache.set(key, value);
      },
      removeItem: (key) => {
        queryCache.remove(key);
      },
    },
    key: 'flama.query-cache',
  });

  const persistOptions = {
    persister,
    // The runtime version of the binary, so an OTA update or a new build starts
    // from a clean cache rather than hydrating stale response shapes.
    ...createQueryPersistOptions(Constants.expoConfig?.version ?? 'dev', config),
  };

  return { queryClient, persistOptions };
}

/**
 * Tells TanStack Query the app is "focused" while it is in the foreground.
 *
 * React Query's focus detection listens for the browser's `visibilitychange`,
 * which React Native does not have — so without this, `refetchOnWindowFocus`
 * never fires on a phone and a query only refreshes when a screen remounts.
 * That matters most for feature flags: a kill switch pulled while the app sat
 * in the background has to land when the user comes back to it.
 */
function followAppState(): void {
  if (Platform.OS === 'web') return;

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });
    return () => subscription.remove();
  });
}
