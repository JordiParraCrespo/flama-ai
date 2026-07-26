/**
 * Platform-agnostic analytics contract.
 *
 * Each platform adapts its provider SDK — `posthog-js` in the browser,
 * `posthog-react-native` on native — to this interface, which is then injected
 * into the DI container. Keeping the boundary here means the rest of the
 * frontend package never imports a vendor SDK directly, so swapping providers
 * is a change in one file per platform rather than a refactor.
 */

/**
 * Analytics payloads cross a network boundary as JSON, so property values are
 * restricted to what survives serialization. This is a provider-independent
 * constraint — encoding it here means a `Date` or class instance is a compile
 * error rather than a `{}` that shows up in the dashboard weeks later.
 */
export type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | AnalyticsValue[]
  | { [key: string]: AnalyticsValue };

export type AnalyticsProperties = Record<string, AnalyticsValue>;

/**
 * Person properties attached to an identified user. `email` and `name` are the
 * conventional keys providers surface in their UI. These are sent to a third
 * party — keep secrets, tokens and anything you wouldn't put in a support
 * ticket out.
 */
export type AnalyticsTraits = AnalyticsProperties;

/**
 * A resolved feature flag value. `undefined` means the flags haven't loaded
 * yet — callers should treat that as "off" rather than blocking on it.
 */
export type FeatureFlagValue = boolean | string | undefined;

export interface IAnalyticsClient {
  /** Record a product event. */
  capture(event: string, properties?: AnalyticsProperties): void;
  /** Associate subsequent events with a user. */
  identify(userId: string, traits?: AnalyticsTraits): void;
  /** Drop the current identity so later events aren't misattributed. */
  reset(): void;
  /** Record a page/screen view. */
  pageView(path: string, properties?: AnalyticsProperties): void;
  /** Whether a boolean flag is enabled. Returns `false` until flags load. */
  isFeatureEnabled(key: string): boolean;
  /** The raw flag value — a string for multivariate flags. */
  getFeatureFlag(key: string): FeatureFlagValue;
  /**
   * Subscribe to flag (re)loads. Returns an unsubscribe function. Flags arrive
   * asynchronously, so UI that branches on them needs to re-render on load.
   */
  onFeatureFlags(listener: () => void): () => void;
}
