import {
  type ConfigDocument,
  ConfigManager,
  type ConfigPath,
  type ConfigPathValue,
  getAttribute,
  type IConfigProvider,
  type IConfigStorage,
  type VersionedConfig,
} from '@flama/frontend-core/config';
import { storage } from '@flama/frontend-mobile';
import { useSyncExternalStore } from 'react';

/**
 * Remote config: tunables the app reads from a static JSON document at
 * `EXPO_PUBLIC_CONFIG_URL`, deep-merged over the defaults below — copy,
 * limits, endpoints. The last document fetched is cached in MMKV, so a launch
 * without network starts from it; without a URL the app runs on the defaults.
 *
 * Not feature flags. A flag is evaluated per user by the API; keeping the two
 * apart is what stops a second, untargeted, unaudited flag system growing in
 * here.
 */
export type AppConfig = VersionedConfig & {
  remote: {
    url?: string;
  };
};

export const staticConfig: AppConfig = {
  // Raise it when a document's shape changes: one whose `minRequiredVersion`
  // is above this build's is refused.
  version: 1,
  remote: {
    url: process.env.EXPO_PUBLIC_CONFIG_URL,
  },
};

const CACHE_KEY = 'flama.remote-config';

const mmkvCache: IConfigStorage<AppConfig> = {
  read() {
    return storage.getItem<ConfigDocument<AppConfig>>(CACHE_KEY) ?? undefined;
  },
  write(document) {
    storage.setItem(CACHE_KEY, document);
  },
};

const urlProvider: IConfigProvider<AppConfig> | undefined = staticConfig.remote.url
  ? {
      async fetch() {
        const response = await fetch(staticConfig.remote.url as string);
        if (!response.ok) return undefined;
        return (await response.json()) as ConfigDocument<AppConfig>;
      },
    }
  : undefined;

export const configManager = new ConfigManager<AppConfig>({
  staticConfig,
  storage: mmkvCache,
  provider: urlProvider,
});

function subscribe(listener: () => void): () => void {
  // The first reader starts the one fetch of the remote layer; every later
  // call gets the same promise back.
  void configManager.load();
  return configManager.subscribe(listener);
}

/** The merged config, or the value at a dotted path; re-renders when the remote layer lands. */
export function useConfig(): AppConfig;
export function useConfig<P extends ConfigPath<AppConfig>>(path: P): ConfigPathValue<AppConfig, P>;
export function useConfig(path?: ConfigPath<AppConfig>): unknown {
  return useSyncExternalStore(subscribe, () =>
    path === undefined ? configManager.getAll() : getAttribute(configManager.getAll(), path),
  );
}
