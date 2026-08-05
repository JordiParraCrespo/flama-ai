'use client';

import type { Query } from '@tanstack/query-core';
import { apiTokensKeys } from './api-tokens.queries';
import { authKeys } from './auth.queries';

/**
 * How long a restored cache entry stays usable before the persister throws it
 * away. Entries older than this are dropped on restore, so a user who comes
 * back after a week never sees week-old data flash on screen.
 */
export const QUERY_PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * `gcTime` for the persisted client. It must be **at least** `maxAge`: React
 * Query garbage-collects an unused query after `gcTime`, and a collected query
 * is not written to storage, so a shorter `gcTime` would silently persist
 * nothing. Both apps get this from {@link defaultQueryClientOptions}.
 */
export const QUERY_PERSIST_GC_TIME = QUERY_PERSIST_MAX_AGE;

/**
 * Features whose queries never leave memory.
 *
 * - `auth` — the session query is `staleTime: Infinity`, so a restored entry
 *   would be treated as fresh forever and `restoreSession()` would never run.
 *   The Zustand auth store is rebuilt by that call, so persisting it would
 *   leave the app looking signed in with no session behind it.
 * - `apiTokens` — credential metadata (token prefixes, scopes, the permission
 *   catalog). Cheap to refetch, and not something to leave sitting in
 *   localStorage or AsyncStorage, neither of which is encrypted at rest.
 */
const NON_PERSISTED_FEATURES: ReadonlySet<string> = new Set([
  authKeys.all[0],
  apiTokensKeys.all[0],
]);

/**
 * Whether a query may be written to storage.
 *
 * Only successful queries are persisted — restoring an error or a pending
 * fetch would replay a failure the user has already moved past. The feature
 * segment is the first entry of every key factory (see the "React Query keys"
 * guide), which is what makes a per-feature deny-list possible.
 */
export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;

  const [feature] = query.queryKey;
  return typeof feature === 'string' && !NON_PERSISTED_FEATURES.has(feature);
}

/**
 * Persistence options shared by web and mobile. The apps supply the platform's
 * `persister` (localStorage on web, AsyncStorage on mobile) and spread this in.
 *
 * `buster` invalidates every persisted cache at once: pass the app version (or
 * build id) so a deploy that changes a response shape drops stale entries
 * instead of hydrating them into components that no longer understand them.
 */
export function createQueryPersistOptions(buster: string) {
  return {
    maxAge: QUERY_PERSIST_MAX_AGE,
    buster,
    dehydrateOptions: { shouldDehydrateQuery },
  };
}

/**
 * Query defaults shared by web and mobile. `gcTime` is pinned to the persist
 * window; `staleTime` is per-app because "how stale is too stale" differs
 * between a tab that stays open and an app resumed from the background.
 */
export function defaultQueryClientOptions(staleTime: number) {
  return {
    queries: {
      staleTime,
      gcTime: QUERY_PERSIST_GC_TIME,
      retry: 1,
    },
  };
}
