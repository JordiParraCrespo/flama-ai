import { createQueryPersistOptions, defaultQueryClientOptions } from '@flama/frontend/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';

export const queryClient = new QueryClient({
  // A cold start is the common case on mobile, so lists are worth keeping for
  // a few minutes before refetching.
  defaultOptions: defaultQueryClientOptions(1000 * 60 * 5),
});

/**
 * Writes the query cache to AsyncStorage so a relaunch (or a resume after the
 * OS reclaimed the app) renders from cache instead of from spinners. Sensitive
 * features are filtered out by `createQueryPersistOptions` — AsyncStorage is
 * not encrypted; tokens stay in expo-secure-store.
 */
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'flama.query-cache',
});

export const persistOptions = {
  persister,
  // The runtime version of the binary, so an OTA update or a new build starts
  // from a clean cache rather than hydrating stale response shapes.
  ...createQueryPersistOptions(Constants.expoConfig?.version ?? 'dev'),
};
