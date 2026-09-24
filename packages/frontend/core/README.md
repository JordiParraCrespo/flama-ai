# @flama/frontend-core

The kernel every frontend app loads. It holds the logic both products share —
session, users, user settings, deployment capabilities, analytics — as plain
entities, repositories and services over `@flama/api-client`, plus the React
bindings that expose them as TanStack Query hooks. Nothing here is web or
mobile: no DOM, no React Native, no router, so `apps/web` and `apps/mobile`
(and the control-plane plugins) all run the same code. It also owns the
InversifyJS container (`FlamaApp`, `TOKENS`) the product packages extend, the
query-cache persistence policy, and the contracts the two products meet on.

`react` and `@tanstack/react-query` are optional peer dependencies: import
`@flama/frontend-core/react` only from a React app.

## What it exports

`@flama/frontend-core` (`src/index.ts`) — `config`, `di` and `modules`:

- **di** — `FlamaApp`, `FlamaAppConfig`, `TOKENS`.
- **modules/analytics** — `AnalyticsService`, `AnalyticsModule`,
  `NoopAnalyticsClient`, `ANALYTICS_EVENTS`, `sanitizeUrlProperties`, the
  `IAnalyticsClient` port.
- **modules/auth** — `AuthService`, `AuthRepository`, `AuthModule`,
  `AuthErrors`, `createAuthStore` (also at `./state`), the `IAuthClient` port
  (with the optional `respondToConsent` a platform hosting the OAuth consent
  page implements).
- **modules/capabilities** — `CapabilitiesService`, `CapabilitiesRepository`,
  `CapabilitiesModule`, `CapabilitiesErrors`.
- **modules/feature-flags** — `FeatureFlagsService`, `FeatureFlagsRepository`,
  `FeatureFlagsModule`, `FeatureFlagsErrors`, `resolveFlagValue`,
  `isFlagEnabled`, the `FeatureFlagsClientContext` an app passes to
  `FlamaApp.create({ featureFlags })`.
- **modules/core** — `createCoreModule`, `AppError`, `toAppError`,
  `MapApiError`, `createErrorMessageResolver`, the `IStorageService` port.
- **modules/user-settings** / **modules/users** — `UserSettingsEntity`,
  `UserEntity` (with `fullName` and `initials`) and their service, repository,
  module and errors; `personInitials`, the one avatar-fallback rule every
  person entity uses.
- **config** (`./config`) — `ConfigManager`, `deepMerge`, `getAttribute`.
- **validation** (`./validation`) — `createZodErrorMap`,
  `ValidationMessageKey`.
- **format** (`./format`) — the date helpers both platforms format with:
  `dateFormatter` (cached `Intl.DateTimeFormat`), `formatShortDate`,
  `formatMediumDate`, `formatDateTime`, `formatMonthYear`,
  `formatRelativeTime`, `formatMessageTime`, `compactAge`. Each takes the
  locale from `useLocale()`; the web kit re-exports them.
- **di** also at `./di`, for code that needs the container without the rest.

`@flama/frontend-core/react` (`src/react/index.ts`):

- `FlamaProvider`, `useFlamaApp`, `useAuthState`.
- Session: `useLogin`, `useLogout`, `useSessionRestore`, `useSocialLogin`,
  `useForgotPassword`, `useResetPassword`, `useChangePassword`,
  `useRespondToConsent`, `authKeys`.
- Permissions: `useAbilityState` / `useAbility`, the caller's CASL ability
  rebuilt from `useMyPermissions`.
- Locale and errors: `useLocale` (the resolved language to format in),
  `useErrorMessage` (a failure as a translated sentence).
- Users: `useProfile`, `useUser`, `useUsers`, `useUpdateUser`, `useDeleteUser`,
  `useMyPermissions`, `usersKeys`.
- Settings: `useUserSettings`, `useUpdateUserSettings`, `userSettingsKeys`.
- Analytics: `useAnalytics`, `useCaptureEvent`, `usePageView`,
  `useCapturePageView`, `useCaptureOnMount`, `analyticsKeys`.
- Feature flags: `useFeatureFlag`, `useFeatureFlagValue`, `useFeatureFlags`,
  `featureFlagKeys`, `featureFlagsQueryOptions`. Values come from the API,
  typed by the catalog in `@flama/shared`; see
  `.agents/rules/feature-flags.md`.
- Capabilities: `useDeploymentCapabilities`, `capabilitiesKeys`.
- Cache policy: `defaultQueryClientOptions`, `createQueryPersistOptions`,
  `shouldDehydrateQuery`, `KERNEL_NON_PERSISTED_FEATURES`, `cacheOwnerKey`,
  `reconcileCacheOwner`, `QUERY_PERSIST_*`.
- Contracts both products use: `MEMBER_LISTS_KEY`, `withFeaturePrefix`.
- Mutation helpers: `withCacheOnSuccess`, which runs a hook's cache update
  before the caller's `onSuccess`, and `HookMutationOptions`, the type every
  mutation hook's `options` takes (everything but `mutationFn`, which is the
  hook's own).

## How to use it

`apps/web/src/lib/flama.ts` builds the container; the app's product package
supplies `modules`:

```ts
import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core';
import { createWebAnalyticsClient, LocalStorageService } from '@flama/frontend-web';
import { webAuthClient } from './auth-client';

export const app = FlamaApp.create({
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '',
  storage: new LocalStorageService(),
  authClient: webAuthClient,
  analytics: createWebAnalyticsClient(),
  modules: consumerModules,
});
```

`FlamaProvider` puts it in context (`apps/web/src/providers/flama-provider.tsx`)
and a screen reads a hook: `const login = useLogin()` in
`apps/web/src/features/auth/screens/login.tsx`.

## How to run it

```bash
pnpm --filter @flama/frontend-core lint    # biome check src/
pnpm --filter @flama/frontend-core test    # vitest run
pnpm --filter @flama/frontend-core arch    # dependency-cruiser
pnpm --filter @flama/frontend-core build   # tsc -> dist, what the apps consume
```

## Depends on / used by

Depends on `@flama/api-client`, `@flama/shared`, `inversify`, `zustand`,
`better-auth` and `@tanstack/query-core`. Used by
`@flama/frontend-consumer`, `@flama/frontend-admin`, `@flama/frontend-web`,
`@flama/frontend-mobile` and all four frontend apps.
