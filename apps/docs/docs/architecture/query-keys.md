---
sidebar_position: 5
---

# React Query Keys

The frontend uses [TanStack Query](https://tanstack.com/query) for server
state. Query keys are the address of each cache entry — they decide what gets
deduplicated, refetched and invalidated. To keep them predictable we follow the
[Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
patterns from TkDodo (a TanStack Query maintainer).

This guide explains the rules and shows how to write a compliant **query key
factory**. The reference implementations live in
`packages/frontend/src/react/users.queries.ts` and `auth.queries.ts`.

## The rules

### 1. Always use arrays

Even when a key is a single string, write it as an array. React Query treats
string keys as `[key]` internally, so standardising on arrays keeps everything
consistent and composable.

```typescript
// ❌ avoid
useQuery({ queryKey: 'users', queryFn: ... });

// ✅ prefer
useQuery({ queryKey: ['users'], queryFn: ... });
```

### 2. Structure keys from generic to specific

Order the entries in a key from the broadest scope to the narrowest. This
mirrors how React Query matches keys: a partial key fuzzy-matches every more
specific key beneath it.

```typescript
["users"][("users", "list")][("users", "list", { search: "jane" })][ // everything users-related // every list // one specific list
  ("users", "detail")
][("users", "detail", "42")]; // every detail // one specific detail
```

### 3. Colocate keys with their queries

Keep the key factory in the same feature file as the hooks that use it (e.g.
`users.queries.ts`), not in a single global `queryKeys.ts`. Related code stays
together and dead keys are easy to spot when a feature is deleted.

### 4. Use a query key factory

Expose a single object per feature that builds every key. Derive each level from
the one above it by **spreading**, so renaming the base key (or adding a scope)
propagates everywhere automatically.

## Anatomy of a factory

```typescript
export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "user";
}

export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (params?: UsersListParams) => [...usersKeys.lists(), params] as const,
  details: () => [...usersKeys.all, "detail"] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  me: () => [...usersKeys.all, "me"] as const,
};
```

Notes:

- **`all`** is the single source of truth for the feature's namespace. Every
  other key spreads it, so there are no hardcoded `'users'` strings scattered
  around.
- **`lists()` / `details()`** are intermediate "scope" levels that take no
  arguments. They exist so you can invalidate _every_ list or _every_ detail in
  one call, regardless of the params/id.
- **`list(params)` / `detail(id)`** are the leaf keys passed to `useQuery`.
- Use `as const` everywhere so keys are inferred as readonly tuples — this gives
  you type-safe keys and autocompletion.

## Using the factory

```typescript
// Read a list
useQuery({
  queryKey: usersKeys.list(params),
  queryFn: () => app.users.findAll(...),
});

// Read a single user
useQuery({
  queryKey: usersKeys.detail(id),
  queryFn: () => app.users.findById(id),
});
```

## Invalidation patterns

Because keys are hierarchical, fuzzy matching lets you invalidate exactly the
scope you need:

```typescript
const queryClient = useQueryClient();

// Invalidate everything for the feature (lists, details, me, ...)
queryClient.invalidateQueries({ queryKey: usersKeys.all });

// Invalidate every list, but leave details untouched
queryClient.invalidateQueries({ queryKey: usersKeys.lists() });

// Invalidate a single detail
queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
```

A common optimistic-update pattern combines `setQueryData` for the entity you
already have with `invalidateQueries` for everything derived from it:

```typescript
useMutation({
  mutationFn: ({ id, dto }) => app.users.update(id, dto),
  onSuccess: (updated, { id }) => {
    // We already have the fresh entity — write it directly.
    queryClient.setQueryData(usersKeys.detail(id), updated);
    // Lists / me may now be stale — let them refetch.
    queryClient.invalidateQueries({ queryKey: usersKeys.all });
  },
});
```

## Pitfalls to avoid

- **Don't skip the scope segment.** Writing `detail: (id) => ['users', id]`
  drops the `'detail'` level. Besides breaking "invalidate all details", it can
  collide with sibling keys — e.g. `detail('me')` would equal the `me` key
  `['users', 'me']`. Always go through `details()`.
- **Don't hardcode the namespace.** `list: () => ['users', 'list']` won't pick
  up a rename of `all`. Spread instead: `[...usersKeys.lists()]`.
- **Don't share one global key file.** Colocate per feature.
