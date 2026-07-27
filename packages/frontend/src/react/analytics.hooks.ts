'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AnalyticsProperties } from '../modules/analytics/analytics.client';
import type { AnalyticsEvent } from '../modules/analytics/analytics.events';
import type { AnalyticsService } from '../modules/analytics/analytics.service';
import { useFlamaApp } from './context';

/**
 * The analytics service, for when a component needs more than `capture` —
 * `identify` after a profile edit, say. Prefer {@link useCaptureEvent} for the
 * common case.
 */
export function useAnalytics(): AnalyticsService {
  return useFlamaApp().analytics;
}

/**
 * A `capture` callback with a stable identity.
 *
 * Safe to pass straight to a memoized child or list in a dependency array,
 * which `useAnalytics().capture` is not: read off the service it loses its
 * `this` binding, and inlining `(e) => analytics.capture(...)` gives every
 * render a new function.
 *
 * ```ts
 * const capture = useCaptureEvent();
 * <Button onPress={() => capture(ANALYTICS_EVENTS.USER_SIGNED_UP, { method: 'password' })} />
 * ```
 */
export function useCaptureEvent(): (
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
) => void {
  const analytics = useAnalytics();

  return useCallback(
    (event: AnalyticsEvent, properties?: AnalyticsProperties) => {
      analytics.capture(event, properties);
    },
    [analytics],
  );
}

/**
 * Captures an event once, when the component mounts.
 *
 * For the "this was shown" family of events — an upsell appeared, an empty
 * state was reached — where the trigger is a render rather than an interaction.
 *
 * Fires once per event name, not once per render: a new `properties` object
 * every render is the normal case and must not re-fire, so `properties` is read
 * at capture time but doesn't itself trigger one. If `event` changes the new
 * event is captured, which is what a component reused across events wants.
 *
 * ```ts
 * useCaptureOnMount(ANALYTICS_EVENTS.PASSWORD_RESET_REQUESTED, { source: 'login' });
 * ```
 */
export function useCaptureOnMount(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  const capture = useCaptureEvent();

  // Read through a ref so a fresh object literal each render doesn't re-fire
  // the effect, while the capture still sends the latest values.
  const latestProperties = useRef(properties);
  latestProperties.current = properties;

  const capturedEvent = useRef<AnalyticsEvent | null>(null);

  useEffect(() => {
    if (capturedEvent.current === event) return;

    capturedEvent.current = event;
    capture(event, latestProperties.current);
  }, [capture, event]);
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
