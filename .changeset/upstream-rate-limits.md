---
"@flama/backend-core": minor
---

An error whose extensions carry `retryAfterSeconds` is now answered with a `Retry-After` header, and `UpstreamLimiter` gives integrations one way to stop calling a provider that told us to slow down.
