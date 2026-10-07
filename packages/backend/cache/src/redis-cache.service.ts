import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

/**
 * `KEYS[1]` keeps the larger of itself and `ARGV[1]`; only a write resets the
 * TTL (`ARGV[2]` seconds). Values are JSON, and a JSON number reads as a Lua
 * number, so the stored form is the one `get` parses.
 */
const SET_MAX_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]))
local candidate = tonumber(ARGV[1])
if current and current >= candidate then return tostring(current) end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return ARGV[1]
`;

@Injectable()
export class RedisCacheService extends CacheService {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      // Optional — `REDIS_PASSWORD` in the root .env. Read here rather than at
      // one call site only, or a `requirepass` Redis accepts the queue and
      // refuses the cache.
      password: this.configService.get<string>('redis.password') || undefined,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
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

  /** One `EVAL`, so the compare and the write cannot interleave with another replica's. */
  async setMax(key: string, value: number, ttlSeconds: number): Promise<number> {
    const kept = await this.redis.eval(
      SET_MAX_SCRIPT,
      1,
      key,
      JSON.stringify(value),
      Math.max(1, Math.ceil(ttlSeconds)),
    );
    return Number(kept);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async reset(): Promise<void> {
    await this.redis.flushdb();
  }
}
