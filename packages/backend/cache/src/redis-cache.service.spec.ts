import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const RedisCtor = vi.fn();
const get = vi.fn<(key: string) => Promise<string | null>>(async () => null);
const quit = vi.fn(async () => 'OK');
const disconnect = vi.fn();

vi.mock('ioredis', () => ({
  default: class {
    constructor(options: unknown) {
      RedisCtor(options);
    }
    get = get;
    quit = quit;
    disconnect = disconnect;
  },
}));

const { RedisCacheService } = await import('./redis-cache.service');

function config(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('RedisCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the configured password to the client', async () => {
    // `REDIS_PASSWORD` used to reach BullMQ only; a `requirepass` Redis then
    // accepted the queue and refused every cache read.
    const cache = new RedisCacheService(
      config({ 'redis.host': 'redis.internal', 'redis.port': 6380, 'redis.password': 's3cret' }),
    );
    await cache.get('k');

    expect(RedisCtor).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'redis.internal', port: 6380, password: 's3cret' }),
    );
  });

  it('connects without a password when none is configured', async () => {
    const cache = new RedisCacheService(config({ 'redis.host': 'localhost', 'redis.port': 6379 }));
    await cache.get('k');

    expect(RedisCtor.mock.calls[0][0]).toMatchObject({ password: undefined });
  });

  it('builds no client until the first command, and one after', async () => {
    // `pnpm generate:api-client` boots the app with no Redis; a client built
    // in the constructor retries in the background and keeps the process alive.
    const cache = new RedisCacheService(config({}));
    expect(RedisCtor).not.toHaveBeenCalled();

    await cache.get('a');
    await cache.get('b');

    expect(RedisCtor).toHaveBeenCalledOnce();
  });

  it('closes nothing on shutdown when no command ran', async () => {
    const cache = new RedisCacheService(config({}));

    await cache.onModuleDestroy();

    expect(quit).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('quits the client on shutdown, disconnecting if quit fails', async () => {
    const cache = new RedisCacheService(config({}));
    await cache.get('k');
    quit.mockRejectedValueOnce(new Error('Connection is closed.'));

    await cache.onModuleDestroy();

    expect(quit).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  // A hit rate is only as good as what is counted: a read that is not
  // reported, or reported with its whole key (ids, tickets), skews it or
  // grows Prometheus without bound.
  describe('read observer', () => {
    function observed() {
      const reads: { operation: string; namespace: string; result: string }[] = [];
      const cache = new RedisCacheService(config({}), { onRead: (read) => reads.push(read) });
      return { reads, cache };
    }

    it('reports a hit or a miss per read, under the key’s first segment only', async () => {
      const { reads, cache } = observed();
      get.mockResolvedValueOnce('1').mockResolvedValueOnce(null);

      await cache.get('user:profile:42');
      await cache.get('session');

      expect(reads).toEqual([
        { operation: 'get', namespace: 'user', result: 'hit' },
        { operation: 'get', namespace: 'session', result: 'miss' },
      ]);
    });

    it('reports a failed read as an error and still fails it', async () => {
      const { reads, cache } = observed();
      get.mockRejectedValueOnce(new Error('down'));

      await expect(cache.get('k:1')).rejects.toThrow('down');
      expect(reads).toEqual([{ operation: 'get', namespace: 'k', result: 'error' }]);
    });

    it('never fails a read because the observer threw', async () => {
      get.mockResolvedValueOnce('1');
      const cache = new RedisCacheService(config({}), {
        onRead: () => {
          throw new Error('observer broke');
        },
      });

      await expect(cache.get('k')).resolves.toBe(1);
    });
  });
});
