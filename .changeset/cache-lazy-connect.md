---
"@flama/backend-cache": patch
---

`RedisCacheService` no longer connects when it is built: the client opens on the first command (`lazyConnect`) and is closed in `onModuleDestroy`, so the app boots without Redis for `generate:openapi` and leaves no connection open after `app.close()`.
