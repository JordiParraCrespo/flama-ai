/**
 * Platform-agnostic analytics contract.
 *
 * An app passes a client implementing it to `FlamaApp.create({ analytics })`;
 * with none, the container binds `NoopAnalyticsClient`. Everything else in the
 * frontend talks to this interface, never to a vendor SDK.
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

export interface IAnalyticsClient {
  /** Record a product event. */
  capture(event: string, properties?: AnalyticsProperties): void;
  /** Associate subsequent events with a user. */
  identify(userId: string, traits?: AnalyticsTraits): void;
  /** Drop the current identity so later events aren't misattributed. */
  reset(): void;
  /** Record a page/screen view. */
  pageView(path: string, properties?: AnalyticsProperties): void;
}
