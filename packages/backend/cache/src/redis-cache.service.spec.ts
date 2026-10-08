import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const RedisCtor = vi.fn();
const get = vi.fn(async () => null);
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
});
