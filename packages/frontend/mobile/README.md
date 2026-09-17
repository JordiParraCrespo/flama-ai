# @flama/frontend-mobile

What both Expo apps — `apps/mobile` and `apps/admin-mobile` — share below
their routes: the persisted query client, secure storage and MMKV, remote
config, form plumbing, i18n, theming, error boundaries and analytics. It is
source-exported (`main` points at `src/index.ts`) and compiled by each app's
Metro bundler, with a subpath export per concern.

The kit is organised by concern — `src/<concern>/<kind>/`, the kinds a
feature has — and the concerns are layered: `platform`, `theme`, `config`,
`forms` and `analytics` are leaves, `i18n` and `layout` build on them. The
kit imports `@flama/design-system-mobile` and `@flama/frontend-core`, never a
product package.

Two modules run code when imported and are imported for that alone:
`@flama/frontend-mobile/polyfills` (first line of the entry file) and
`@flama/frontend-mobile/i18n` (first line of the root layout). Both are
listed in `package.json` `sideEffects`, with `platform/lib/sentry.ts`.

## What it exports

From the root and from the matching subpath (`./analytics`, `./config`,
`./forms`, `./i18n`, `./layout`, `./platform`, `./theme`):

- **platform** — `createQueryPersistence` (a `QueryClient` plus MMKV-backed
  `persistOptions`), `ExpoSecureStoreService`, `storage`, `stateStorage`,
  `queryStorage`, `initPurchases`, `Sentry`, `sentryEnabled`.
- **config** — `configManager`, `ConfigManagerContext`, `useConfigManager`,
  `useConfig`, `AppConfig`, `staticConfig`.
- **forms** — `useZodResolver`, `FormField`.
- **i18n** — the i18next instance, `LOCALE_STORAGE_KEY`, `setLocale`,
  `LanguageSwitcher`.
- **theme** — `THEME`, `NAV_THEME`.
- **layout** — `ErrorBoundary`, `AppErrorFallback`, `ScreenErrorFallback`.
- **analytics** — `createMobileAnalyticsClient`, `ScreenViewTracker`.

## How to use it

`apps/mobile/lib/query.ts` builds the persisted client, naming the product's
sensitive features:

```ts
import { CONSUMER_NON_PERSISTED_FEATURES } from '@flama/frontend-consumer/react';
import { createQueryPersistence } from '@flama/frontend-mobile';

export const { queryClient, persistOptions } = createQueryPersistence({
  nonPersistedFeatures: CONSUMER_NON_PERSISTED_FEATURES,
});
```

`apps/mobile/app/_layout.tsx` imports the i18n bootstrap for its side effect
and then the rest by name:

```tsx
import '@flama/frontend-mobile/i18n';
import {
  AppErrorFallback,
  ConfigManagerContext,
  configManager,
  ErrorBoundary,
  initPurchases,
  NAV_THEME,
  ScreenErrorFallback,
  ScreenViewTracker,
} from '@flama/frontend-mobile';
```

`apps/mobile/index.ts` starts with `import '@flama/frontend-mobile/polyfills'`
— a polyfill imported second is a polyfill that did nothing.

## How to run it

```bash
pnpm --filter @flama/frontend-mobile lint   # biome check src/
pnpm --filter @flama/frontend-mobile test   # vitest run
pnpm --filter @flama/frontend-mobile arch   # concern layering
```

## Depends on / used by

Depends on `@flama/design-system-mobile`, `@flama/frontend-core` and
`@flama/translations`; React Native, Expo, MMKV, TanStack Query, i18next and
React Hook Form are peer dependencies the app provides. Used by `apps/mobile`
and `apps/admin-mobile`.
