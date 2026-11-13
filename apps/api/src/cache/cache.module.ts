import { createMetricsProvider } from '@flama/backend-core';
import { Module } from '@nestjs/common';
import { CacheMetrics, CacheReadMetricsAdapter } from './infrastructure/cache-metrics.adapter';

/**
 * The API's side of `@flama/backend-cache`: the metric its reads are counted
 * on (`cache_reads_total`), and the observer that counts them. A module of
 * its own so `CacheModule.registerAsync` in `app.module.ts` can import it
 * and inject the observer into the cache it builds.
 */
@Module({
  providers: [...createMetricsProvider(CacheMetrics), CacheReadMetricsAdapter],
  exports: [CacheReadMetricsAdapter],
})
export class CacheMetricsModule {}
