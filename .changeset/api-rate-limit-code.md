---
"@flama/api": patch
"@flama/translations": patch
"@flama/api-client": patch
---

A rate-limited request answers the `RATE_001` catalog error, with the wait in `Retry-After` and a `retryAfter` extension, instead of Nest's codeless 429.
