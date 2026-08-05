---
"@flama/frontend": minor
---

Add a shared TanStack Query cache-persistence policy.

`@flama/frontend/react` now exports `defaultQueryClientOptions`,
`createQueryPersistOptions` and `shouldDehydrateQuery`, which `apps/web` and
`apps/mobile` feed to `PersistQueryClientProvider` alongside their platform
persister (`localStorage` / `AsyncStorage`). The policy pins `gcTime` to the
24h persist window (a garbage-collected query is never written to storage),
busts the cache on app version, and keeps `auth` and `apiTokens` queries — plus
anything that isn't a successful fetch — in memory only.
