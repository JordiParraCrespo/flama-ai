'use client';

import { type UseQueryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { FeatureFlags, FeatureFlagValue } from '../modules/analytics/analytics.client';
import { isFlagEnabled } from '../modules/analytics/feature-flags';
import { useFlamaApp } from './context';

/**
 * Query key factory for the `analytics` feature.
 *
 * Same shape as the other feature key factories: generic to specific, each
 * level derived from the one above, so `analyticsKeys.all` invalidates the
 * whole subtree.
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  flags: () => [...analyticsKeys.all, 'feature-flags'] as const,
};

/**
 * The provider's flag set as a TanStack Query.
 *
 * Flags are remote state fetched over the network, so they belong in the query
 * cache like any other — the provider only has to answer one async read, and
 * caching, deduplication and refetch-on-reconnect come from the query client
 * rather than from each adapter. That is what keeps the port small enough for a
 * non-PostHog provider to satisfy.
 *
 * When the provider can push flag updates this subscribes and invalidates on
 * change; when it can't, flags refresh on the query's normal schedule.
 */
export function useFeatureFlags<TData = FeatureFlags>(
  options?: Omit<UseQueryOptions<FeatureFlags, Error, TData>, 'queryKey' | 'queryFn'>,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    return app.analytics.onFeatureFlags(() => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.flags() });
    });
  }, [app, queryClient]);

  return useQuery({
    queryKey: analyticsKeys.flags(),
    queryFn: () => app.analytics.getFeatureFlags(),
    // Flags change on the provider's dashboard, not in response to anything the
    // user did here, so refetching on every mount would be pure noise. Pushed
    // updates cover the case where staleness actually matters.
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Reads a multivariate flag's value, for A/B tests with more than two arms.
 * Returns `undefined` until flags load, and for a flag the provider doesn't
 * know about.
 */
export function useFeatureFlagValue(key: string): FeatureFlagValue {
  const { data } = useFeatureFlags({ select: (flags) => flags[key] });

  return data;
}

/**
 * Reads a boolean feature flag.
 *
 * Returns `false` until flags load, so the first render always takes the
 * control branch — never gate a destructive or paid action on a flag flipping
 * to `true` late. Use {@link useFeatureFlags} directly when you need the
 * loading state to hold rendering back instead.
 *
 * A multivariate flag reads as enabled on any variant, matching how providers
 * treat a variant string as an "on" state.
 */
export function useFeatureFlag(key: string): boolean {
  return isFlagEnabled(useFeatureFlagValue(key));
}
