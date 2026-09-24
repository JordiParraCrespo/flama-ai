---
"@flama/frontend-core": minor
---

Breaking: `profileQueryKey` is no longer exported from `@flama/frontend-core/react`; use `usersKeys.me()`. The capabilities query is keyed `['capabilities', 'deployment']` (was `['capabilities']`), and the persist revision is bumped to drop the old entry. `usersKeys.detail` takes `string | undefined` and `useUser` fetches with `skipToken` when there is no id. New `withCacheOnSuccess(options, update)`; every mutation hook uses it, so a caller's `onSuccess` no longer replaces the hook's cache update (logout clears the cache again). `useUpdateUser` invalidates `lists()` and `me()` instead of `all`; `useDeleteUser` removes the deleted `detail(id)` and invalidates `lists()`. `MEMBER_LISTS_KEY` is unchanged.
