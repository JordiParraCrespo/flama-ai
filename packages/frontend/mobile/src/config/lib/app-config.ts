import type { VersionedConfig } from '@flama/frontend-core/config';

/**
 * Remote config: tunables the app reads from a static document (`remote.url`)
 * layered over these defaults — copy, limits, endpoints.
 *
 * Not feature flags. A flag is evaluated per user by the API and read with
 * `useFeatureFlag` from `@flama/frontend-core/react`; keeping the two apart is
 * what stops a second, untargeted, unaudited flag system growing in here.
 */
export type AppConfig = VersionedConfig & {
  remote: {
    url?: string;
  };
};

export const staticConfig: AppConfig = {
  version: 1,
  remote: {
    url: process.env.EXPO_PUBLIC_CONFIG_URL,
  },
};
