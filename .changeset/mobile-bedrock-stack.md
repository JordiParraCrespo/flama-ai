---
"@flama/mobile": minor
"@flama/admin-mobile": minor
"@flama/mobile-showcase": minor
"@flama/design-system-mobile": minor
"@flama/frontend-mobile": minor
"@flama/frontend-core": minor
"@flama/api-client": minor
"@flama/translations": minor
---

Port the rn-bedrock mobile stack into Flama: Expo SDK 57 + dev client, nitro-fetch, MMKV, Sentry/RevenueCat optional keys, gorhom sheet forks, Legend List, expo-image, nano-icons, hey-api client generation, and namespaced translation files.

- `@flama/frontend-mobile` owns the shared mobile glue: the MMKV query
  persistence wrapper, the polyfills, `FormField` and SecureStore.
- `@flama/frontend-core` gains `ConfigManager` under `@flama/frontend-core/config`.
