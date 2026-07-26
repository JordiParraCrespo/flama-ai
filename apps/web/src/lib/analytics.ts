import type {
  AnalyticsProperties,
  AnalyticsTraits,
  FeatureFlagValue,
  IAnalyticsClient,
} from '@flama/frontend';
import type { PostHog } from 'posthog-js';

/**
 * PostHog adapter for the web app.
 *
 * The SDK is loaded with a dynamic `import()` rather than a static one, so it
 * lands in its own chunk and is fetched only when a project key is configured.
 * That keeps ~50KB of vendor JavaScript off the critical path of the marketing
 * and auth pages, where it would otherwise cost Core Web Vitals for visitors
 * who never reach the app.
 *
 * Because loading is async but the DI container is built synchronously, calls
 * made before the SDK arrives are queued and replayed on load. Flag reads are
 * the exception: they must answer synchronously, so they report "off" until
 * flags resolve. See `useFeatureFlag` for why that's the correct default.
 */
class PostHogAnalyticsClient implements IAnalyticsClient {
  private posthog: PostHog | null = null;
  private pending: Array<(posthog: PostHog) => void> = [];
  private readonly flagListeners = new Set<() => void>();

  constructor(
    private readonly apiKey: string,
    private readonly host: string,
  ) {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const { default: posthog } = await import('posthog-js');

      posthog.init(this.apiKey, {
        api_host: this.host,
        // Page views are driven from the router via `usePageView`. PostHog's
        // automatic capture only fires on hard loads, which in a SPA means
        // every client-side navigation would go uncounted.
        capture_pageview: false,
        persistence: 'localStorage+cookie',
      });

      posthog.onFeatureFlags(() => {
        for (const listener of this.flagListeners) listener();
      });

      this.posthog = posthog;
      for (const call of this.pending) call(posthog);
      this.pending = [];
    } catch (error) {
      // A blocked or failed SDK load must not break the app. Every subsequent
      // call stays queued against a client that never arrives, which is
      // functionally the no-op client.
      console.warn('[analytics] PostHog failed to load', error);
    }
  }

  private enqueue(call: (posthog: PostHog) => void): void {
    if (this.posthog) {
      call(this.posthog);
    } else {
      this.pending.push(call);
    }
  }

  capture(event: string, properties?: AnalyticsProperties): void {
    this.enqueue((posthog) => posthog.capture(event, properties));
  }

  identify(userId: string, traits?: AnalyticsTraits): void {
    this.enqueue((posthog) => posthog.identify(userId, traits));
  }

  reset(): void {
    this.enqueue((posthog) => posthog.reset());
  }

  pageView(path: string, properties?: AnalyticsProperties): void {
    this.enqueue((posthog) => posthog.capture('$pageview', { $current_url: path, ...properties }));
  }

  isFeatureEnabled(key: string): boolean {
    return this.posthog?.isFeatureEnabled(key) ?? false;
  }

  getFeatureFlag(key: string): FeatureFlagValue {
    return this.posthog?.getFeatureFlag(key);
  }

  onFeatureFlags(listener: () => void): () => void {
    this.flagListeners.add(listener);
    return () => this.flagListeners.delete(listener);
  }
}

/**
 * Builds the analytics client from the environment, or returns `undefined`
 * when no key is set so the app falls back to the no-op client. The boilerplate
 * has to run with no analytics account, so an unset key is a supported state,
 * not a misconfiguration.
 */
export function createWebAnalyticsClient(): IAnalyticsClient | undefined {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (!apiKey) return undefined;

  // Defaults to the EU cloud region. Set VITE_POSTHOG_HOST to
  // https://us.i.posthog.com for a US project, or to your own host if
  // self-hosting.
  const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

  return new PostHogAnalyticsClient(apiKey, host);
}
