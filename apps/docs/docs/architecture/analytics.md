---
sidebar_position: 6
---

# Analytics & Feature Flags

Analytics lives in `packages/frontend` as a pluggable module, following the same
platform-adapter pattern as storage and authentication. The shared code never
imports a vendor SDK — each app supplies an adapter, so swapping providers is a
change in one file per platform rather than a refactor.

The boilerplate ships PostHog adapters, chosen because one integration covers
product analytics, feature flags and experiments. Nothing outside the two
adapter files depends on that choice.

## Setup

Analytics is off by default. Set a project key to enable it:

```bash
# apps/web/.env
VITE_POSTHOG_KEY=phc_your_project_key

# apps/mobile/.env
EXPO_PUBLIC_POSTHOG_KEY=phc_your_project_key
```

Both default to the EU cloud region. Set `VITE_POSTHOG_HOST` /
`EXPO_PUBLIC_POSTHOG_HOST` to `https://us.i.posthog.com` for a US project, or to
your own origin when self-hosting.

With no key set the app falls back to `NoopAnalyticsClient`: events are dropped
and every flag reads as off. On web the SDK is also dropped from the bundle
entirely — Vite inlines the unset env var and eliminates the unreachable client,
so an unconfigured build ships zero analytics bytes. With a key set, the SDK is
loaded through a dynamic `import()` and lands in its own chunk, keeping it off
the critical path.

## Capturing events

Event names live in one catalog so a rename is a compile error rather than a
silently split funnel:

```ts
import { ANALYTICS_EVENTS } from '@flama/frontend';
import { useAnalytics } from '@flama/frontend/react';

function UpgradeButton() {
  const analytics = useAnalytics();

  return <button onClick={() => analytics.capture(ANALYTICS_EVENTS.USER_SIGNED_UP)}>Upgrade</button>;
}
```

Add new events to `packages/frontend/src/modules/analytics/analytics.events.ts`.
Property values are constrained to JSON-serializable types, so passing a `Date`
or a class instance is a type error rather than a `{}` in the dashboard.

Authentication events are already wired in `AuthService`: sign-in, sign-up,
sign-out and both password-reset steps. It also calls `identify()` on login and
`reset()` on logout, so events are attributed correctly and a shared device
doesn't leak one user's activity into another's profile.

Page views are driven from the router — `apps/web/src/routes/__root.tsx` on web
and `ScreenViewTracker` in `apps/mobile/app/_layout.tsx` on mobile, both via
`usePageView`. Neither router emits navigations a provider can observe on its
own, so without this only the first load would ever be counted.

## Query strings never leave the app

Several routes carry secrets in the query string — `/reset-password?token=…`
most obviously. Providers attach the current location to _every_ event
automatically (PostHog sends `$current_url`, `$referrer` and their `$initial_`
variants, including on autocapture events the app never raises itself), so
sending only the pathname from `pageView()` is not sufficient on its own.

`sanitizeUrlProperties` strips the query string and fragment from every
URL-valued property, and the web adapter wires it into PostHog's `before_send`
so it applies to all outgoing events. It is provider-independent — any new
adapter should hook it into the equivalent facility.

Campaign attribution is unaffected: `before_send` runs after PostHog has
extracted UTM parameters into their own properties. If you need a specific
query parameter in your analytics, add it as an explicit event property rather
than relaxing the sanitizer.

## Feature flags

```ts
import { useFeatureFlag } from '@flama/frontend/react';

function Checkout() {
  const useNewFlow = useFeatureFlag('new-checkout');
  return useNewFlow ? <NewCheckout /> : <LegacyCheckout />;
}
```

Flags resolve asynchronously, so the first render always sees `false` and the
hook re-renders when they load. Treat `false` as the control branch — never gate
a destructive or paid action on a flag flipping to `true` late.

`useFeatureFlagValue` returns the raw value for multivariate flags, which is what
A/B tests with more than two arms need.

## Failure behavior

`AnalyticsService` wraps every provider call. A misconfigured key, a blocked
script, or an SDK exception produces a `console.warn` and nothing else — a
dropped event is always preferable to a broken login. Flag reads fall back to
the control branch on error.

## Adding a provider

Implement `IAnalyticsClient` (`analytics.client.ts`) and pass it to
`FlamaApp.create({ analytics })`. The web adapter in `apps/web/src/lib/analytics.ts`
is the reference: it queues calls made before the SDK finishes loading and
replays them on arrival, since the DI container is built synchronously.
