---
"@flama/frontend": minor
---

Add a pluggable analytics module with feature-flag support.

`packages/frontend` gains an `analytics` module following the same
platform-adapter pattern as `storage` and `authClient`: an `IAnalyticsClient`
port, an `AnalyticsService` that wraps every provider call so a failing SDK can
never break the app, a typed event catalog, and a `NoopAnalyticsClient` used
whenever no provider is configured.

`FlamaApp.create()` takes an optional `analytics` adapter, and the React entry
point exports `useAnalytics`, `useFeatureFlag`, `useFeatureFlagValue` and
`usePageView`. Sign-in, sign-up, sign-out and password-reset events are captured
from `AuthService`, which also identifies the user on login and resets identity
on logout.

Web and mobile ship PostHog adapters driven by `VITE_POSTHOG_KEY` /
`EXPO_PUBLIC_POSTHOG_KEY`. Both default to the EU cloud region and are inert
when unset.
