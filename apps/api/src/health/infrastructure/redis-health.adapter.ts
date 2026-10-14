import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Pings Redis on a connection of its own. It fails fast (no offline queue, one
 * retry per command), so with Redis down the ping rejects at once instead of
 * after ioredis's retries; a Redis that accepts the socket and never answers
 * is what the readiness deadline is for.
 */
@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private readonly redis: Redis;

  constructor(configService: ConfigService) {
    this.redis = new Redis({
      host: configService.get('redis.host'),
      port: configService.get('redis.port'),
      password: configService.get<string>('redis.password') || undefined,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    // ioredis emits `error` on every reconnect attempt; without a listener Node
    // treats it as an unhandled exception.
    this.redis.on('error', (error: Error) => {
      this.logger.warn({ message: 'Health Redis unavailable', error: error.message });
    });
  }

  async ping(): Promise<void> {
    // lazyConnect plus no offline queue: connect on first use, so a ping
    // before the socket is up fails instead of waiting for it.
    if (this.redis.status === 'wait') await this.redis.connect();
    await this.redis.ping();
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
