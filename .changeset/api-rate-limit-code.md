---
"@flama/api": patch
"@flama/translations": patch
"@flama/api-client": patch
---

A rate-limited request answers `RATE_001` with a `retryAfter` member instead of a codeless 429. `CredentialThrottlerGuard` throws the new `ThrottlingErrors.TOO_MANY_REQUESTS` catalog error (the base guard still sets `Retry-After`), the routes with their own `@Throttle` document it, both locales carry a message, and the OpenAPI document and typed client are regenerated.
