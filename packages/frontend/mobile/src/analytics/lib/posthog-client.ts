import type { AnalyticsProperties, AnalyticsTraits, IAnalyticsClient } from '@flama/frontend-core';
import PostHog from 'posthog-react-native';

/**
 * PostHog adapter for the mobile app.
 *
 * Unlike the web adapter this constructs the SDK eagerly — there is no bundle
 * to split in a native app, and the client needs to be live before the first
 * screen renders. Page views map to PostHog's `screen()`, which is the native
 * equivalent and keeps mobile sessions readable next to web ones.
 */
class PostHogAnalyticsClient implements IAnalyticsClient {
  private readonly posthog: PostHog;

  constructor(apiKey: string, host: string) {
    this.posthog = new PostHog(apiKey, { host, preloadFeatureFlags: false });
  }

  capture(event: string, properties?: AnalyticsProperties): void {
    this.posthog.capture(event, properties);
  }

  identify(userId: string, traits?: AnalyticsTraits): void {
    this.posthog.identify(userId, traits);
  }

  reset(): void {
    this.posthog.reset();
  }

  pageView(path: string, properties?: AnalyticsProperties): void {
    void this.posthog.screen(path, properties);
  }
}

/**
 * Builds the analytics client from the environment, or returns `undefined`
 * when no key is set so the app falls back to the no-op client.
 */
export function createMobileAnalyticsClient(): IAnalyticsClient | undefined {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return undefined;

  // Defaults to the EU cloud region — see the web adapter for the US/self-host
  // alternatives.
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

  return new PostHogAnalyticsClient(apiKey, host);
}
