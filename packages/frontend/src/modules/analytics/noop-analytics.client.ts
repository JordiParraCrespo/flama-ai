import type {
  AnalyticsProperties,
  AnalyticsTraits,
  FeatureFlagValue,
  IAnalyticsClient,
} from './analytics.client';

/**
 * The default client when no provider is configured.
 *
 * The boilerplate has to boot and run with no analytics account, so this is
 * what {@link FlamaApp} falls back to. Every method is a no-op and every flag
 * reads as off, which means feature-flagged code paths stay on their default
 * branch rather than crashing.
 */
export class NoopAnalyticsClient implements IAnalyticsClient {
  capture(_event: string, _properties?: AnalyticsProperties): void {}

  identify(_userId: string, _traits?: AnalyticsTraits): void {}

  reset(): void {}

  pageView(_path: string, _properties?: AnalyticsProperties): void {}

  isFeatureEnabled(_key: string): boolean {
    return false;
  }

  getFeatureFlag(_key: string): FeatureFlagValue {
    return undefined;
  }

  onFeatureFlags(_listener: () => void): () => void {
    return () => {};
  }
}
