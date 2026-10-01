---
"@flama/backend-core": minor
"@flama/backend-ddd": patch
"@flama/api": patch
---

`RequestContextMiddleware` replaces `RequestContextInterceptor`, so guard 401/403/429 answers carry `correlationId`; the id is echoed as `x-correlation-id` and an inbound one is honoured only if 1-64 of `[A-Za-z0-9._:-]`.
