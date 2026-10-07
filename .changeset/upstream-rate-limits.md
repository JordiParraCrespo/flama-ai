---
"@flama/backend-core": minor
"@flama/backend-cache": minor
---

Calling a system we do not run now has a kernel: `UpstreamLimiter`, `UpstreamPause`, `ConcurrencyLimit` and `readRateLimit` in `@flama/backend-core`, an `AppError.retryAfterSeconds` that `AllExceptionsFilter` sends as `Retry-After`, and `CacheService.setMax` so a shared pause only ever lengthens. The rule is `.agents/rules/integrations.md`.
