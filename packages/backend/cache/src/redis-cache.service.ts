import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

/**
 * How one cached read went: the value was there (`hit`), was not (`miss`),
 * or Redis failed (`error`).
 */
export type CacheReadResult = 'hit' | 'miss' | 'error';

/** The cache operations that read, the ones a hit rate is taken over. */
export type CacheReadOperation = 'get';

/**
 * Told about every read, so the app can count hits and misses. `namespace`
 * is the key's first segment, as the caller wrote it (`user` for
 * `user:profile:42`), never the whole key: keys carry ids and tickets. It
 * must not throw; a throw is swallowed.
 */
export type CacheReadObserver = (read: {
  operation: CacheReadOperation;
  namespace: string;
  result: CacheReadResult;
}) => void;

export interface RedisCacheOptions {
  /** Told how each read went; absent, reads are not observed. */
  onRead?: CacheReadObserver;
}

@Injectable()
export class RedisCacheService extends CacheService implements OnModuleDestroy {
  /** Built by the first command, so constructing the driver opens nothing. */
  private client?: Redis;
  private readonly onRead: CacheReadObserver | undefined;

  constructor(
    private readonly configService: ConfigService,
    options: RedisCacheOptions = {},
  ) {
    super();
    this.onRead = options.onRead;
  }

  private get redis(): Redis {
    this.client ??= new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      // Optional — `REDIS_PASSWORD` in the root .env. Read here rather than at
      // one call site only, or a `requirepass` Redis accepts the queue and
      // refuses the cache.
      password: this.configService.get<string>('redis.password') || undefined,
    });
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    const client = this.client;
    if (!client) return;
    await client.quit().catch(() => client.disconnect());
  }

  async get<T>(key: string): Promise<T | undefined> {
    let value: string | null;
    try {
      value = await this.redis.get(key);
    } catch (error) {
      this.report('get', key, 'error');
      throw error;
    }
    this.report('get', key, value ? 'hit' : 'miss');
    if (!value) return undefined;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, serialized, 'EX', ttl);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async reset(): Promise<void> {
    await this.redis.flushdb();
  }

  private report(operation: CacheReadOperation, key: string, result: CacheReadResult): void {
    if (!this.onRead) return;
    try {
      this.onRead({ operation, namespace: cacheNamespace(key), result });
    } catch {
      // Observing a read never fails it.
    }
  }
}

/** A key's first `:`-separated segment: `user` for `user:profile:42`, the key itself when it has none. */
function cacheNamespace(key: string): string {
  const end = key.indexOf(':');
  return end === -1 ? key : key.slice(0, end);
}
