'use client';

import { useEffect } from 'react';
import type { AnalyticsService } from '../modules/analytics/analytics.service';
import { useFlamaApp } from './context';

/** The analytics service, for imperative `capture()` calls from components. */
export function useAnalytics(): AnalyticsService {
  return useFlamaApp().analytics;
}

/**
 * Records a page view whenever `path` changes.
 *
 * Call this once, high in the tree, wired to the router's current location.
 * Single-page and native apps don't emit navigations the provider can see on
 * its own, so without this only the first load is ever counted. Each app wires
 * it up in its own analytics module — `PageViewTracker` on web,
 * `ScreenViewTracker` on mobile.
 */
export function usePageView(path: string): void {
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.pageView(path);
  }, [analytics, path]);
}
