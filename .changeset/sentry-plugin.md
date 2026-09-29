---
"@flama/mobile": major
"@flama/frontend-mobile": minor
---

Sentry leaves the starter: the kit no longer exports `Sentry` or `sentryEnabled`, and its error boundaries log what they catch to the console until an app passes its own reporter to `setErrorReporter`.
