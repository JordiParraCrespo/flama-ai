export abstract class CacheService {
  abstract get<T>(key: string): Promise<T | undefined>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract reset(): Promise<void>;

  /**
   * Keep the larger of the number stored at `key` and `value`, and answer the
   * one kept, in one atomic command. Only a larger value resets the TTL.
   *
   * This is the "only ever lengthen" primitive: a `get`, compare and `set` is
   * three steps another replica can interleave with, and the shorter value then
   * wins. It is what keeps a rate-limit pause from being cut short
   * (`@flama/backend-core`'s `UpstreamPause`).
   */
  abstract setMax(key: string, value: number, ttlSeconds: number): Promise<number>;
}
