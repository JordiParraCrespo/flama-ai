# @flama/backend-cache

## 0.1.1

### Patch Changes

- 1a5a032: `RedisCacheService` no longer connects when it is built: the client is created by the first command and quit in `onModuleDestroy`, so the app boots without Redis for `generate:openapi` and leaves no connection open after `app.close()`.
