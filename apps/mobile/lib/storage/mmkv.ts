import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const preferences = createMMKV({ id: 'flama.preferences' });
const queryCache = createMMKV({ id: 'flama.query-cache' });
const zustand = createMMKV({ id: 'flama.zustand' });

export type JsonStorage = {
  setItem<T>(key: string, value: T): void;
  getItem<T>(key: string): T | null;
  removeItem(key: string): void;
};

function jsonStorage(store: ReturnType<typeof createMMKV>): JsonStorage {
  return {
    setItem(key, value) {
      store.set(key, JSON.stringify(value));
    },
    getItem(key) {
      const value = store.getString(key);
      return value === undefined ? null : (JSON.parse(value) as never);
    },
    removeItem(key) {
      store.remove(key);
    },
  };
}

/** Preferences and config cache. JSON-encoded. Not secrets. */
export const storage = jsonStorage(preferences);

/** Raw string storage for TanStack Query persist (it serialises itself). */
export const queryStorage: StateStorage = {
  setItem(key, value) {
    queryCache.set(key, value);
  },
  getItem(key) {
    return queryCache.getString(key) ?? null;
  },
  removeItem(key) {
    queryCache.remove(key);
  },
};

/** Raw string storage for zustand persist. Own MMKV instance. */
export const stateStorage: StateStorage = {
  setItem(key, value) {
    zustand.set(key, value);
  },
  getItem(key) {
    return zustand.getString(key) ?? null;
  },
  removeItem(key) {
    zustand.remove(key);
  },
};
