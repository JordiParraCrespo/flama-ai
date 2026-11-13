# @flama/backend-cache

Redis cache abstraction for the NestJS API, backed by
[`ioredis`](https://github.com/redis/ioredis).

## What's inside

- `CacheService` — abstract cache contract (the DI token consumers depend on).
- `RedisCacheService` — the concrete `ioredis`-backed implementation. It
  creates its client on the first command rather than in its constructor,
  and quits it on shutdown (`onModuleDestroy`), so the app boots without
  Redis for `generate:openapi`.
- `CacheModule` — NestJS module that binds `CacheService` to `RedisCacheService`
  and reads connection config from `@nestjs/config`. `register()` takes
  `RedisCacheOptions`; `registerAsync({ inject, useFactory })` builds them
  from the app's providers.
- **Reads can be observed.** `onRead` (a `RedisCacheOptions` field) is told
  how each read went (`hit`, `miss` or `error`), with the operation and the
  key's first `:`-separated segment as its `namespace`, never the key. The
  package has no metrics dependency; `apps/api` counts them as
  `cache_reads_total` (`CacheReadMetricsAdapter`). An observer that throws
  never fails the read.

This follows the project's **pluggable service** pattern: depend on the abstract
`CacheService`, and the module decides the implementation.

## Usage

```ts
// module
import { CacheModule } from '@flama/backend-cache';

@Module({ imports: [CacheModule.register()] })
export class AppModule {}

// or, with every read counted
CacheModule.registerAsync({
  inject: [CacheReadMetricsAdapter],
  useFactory: (metrics: CacheReadMetricsAdapter) => ({ onRead: metrics.observe }),
});

// service
import { CacheService } from '@flama/backend-cache';

constructor(private readonly cache: CacheService) {}
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`.
