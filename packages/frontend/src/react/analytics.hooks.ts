'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { AnalyticsService } from '../modules/analytics/analytics.service';
import { useFlamaApp } from './context';

/** The analytics service, for imperative `capture()` calls from components. */
export function useAnalytics(): AnalyticsService {
  return useFlamaApp().analytics;
}

/**
 * Reads a boolean feature flag and re-renders when flags load.
 *
 * Flags resolve asynchronously, so the first render always sees `false`. Treat
 * that as the control/default branch — never gate a destructive or paid action
 * on a flag flipping to `true` late.
 */
export function useFeatureFlag(key: string): boolean {
  const analytics = useAnalytics();

  const subscribe = useCallback(
    (onChange: () => void) => analytics.onFeatureFlags(onChange),
    [analytics],
  );

  const getSnapshot = useCallback(() => analytics.isFeatureEnabled(key), [analytics, key]);

  // The server snapshot is always the control branch: flags are a client-side
  // concern and rendering a variant during SSR/prerender would mismatch.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Reads a multivariate flag's value, for A/B tests with more than two arms.
 * Returns `undefined` until flags load.
 */
export function useFeatureFlagValue(key: string): boolean | string | undefined {
  const analytics = useAnalytics();

  const subscribe = useCallback(
    (onChange: () => void) => analytics.onFeatureFlags(onChange),
    [analytics],
  );

  const getSnapshot = useCallback(() => analytics.getFeatureFlag(key), [analytics, key]);

  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/**
 * Records a page view whenever `path` changes.
 *
 * Call this once, high in the tree, wired to the router's current location —
 * `apps/web` drives it from TanStack Router. Single-page apps don't emit
 * navigations the provider can see on its own, so without this only the first
 * load is ever counted.
 */
export function usePageView(path: string): void {
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.pageView(path);
  }, [analytics, path]);
}
