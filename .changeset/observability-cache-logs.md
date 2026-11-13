---
"@flama/api": minor
"@flama/backend-cache": minor
"@flama/backend-core": minor
---

Observability for the cache and the logs. The API exports `cache_reads_total` for the Redis cache (hits, misses, errors by key namespace), with dashboard panels and an alert. `LOG_FILE` also writes the API's log lines as JSON to a file, which `pnpm monitoring:up` now ships to Loki through Grafana Alloy, and `pnpm logs` queries with LogQL. `@flama/backend-cache` takes an `onRead` observer (`CacheModule.register(options)` / `registerAsync`); `@flama/backend-core`'s logging takes a `file`.
