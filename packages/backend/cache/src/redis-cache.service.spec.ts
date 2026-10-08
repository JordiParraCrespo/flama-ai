import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const RedisCtor = vi.fn();
const quit = vi.fn(async () => 'OK');
const disconnect = vi.fn();
let status = 'wait';

vi.mock('ioredis', () => ({
  default: class {
    constructor(options: unknown) {
      RedisCtor(options);
    }
    get status() {
      return status;
    }
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
    RedisCtor.mockClear();
    quit.mockClear();
    disconnect.mockClear();
    status = 'wait';
  });

  it('passes the configured password to the client', () => {
    // `REDIS_PASSWORD` used to reach BullMQ only; a `requirepass` Redis then
    // accepted the queue and refused every cache read.
    new RedisCacheService(
      config({ 'redis.host': 'redis.internal', 'redis.port': 6380, 'redis.password': 's3cret' }),
    );

    expect(RedisCtor).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'redis.internal', port: 6380, password: 's3cret' }),
    );
  });

  it('connects without a password when none is configured', () => {
    new RedisCacheService(config({ 'redis.host': 'localhost', 'redis.port': 6379 }));

    expect(RedisCtor.mock.calls[0][0]).toMatchObject({ password: undefined });
  });

  it('opens no connection when it is constructed', () => {
    // `pnpm generate:api-client` boots the app with no Redis; an eager client
    // retries in the background and keeps the process alive.
    new RedisCacheService(config({ 'redis.host': 'localhost', 'redis.port': 6379 }));

    expect(RedisCtor.mock.calls[0][0]).toMatchObject({ lazyConnect: true });
  });

  it('closes a client that never connected without connecting it', async () => {
    const cache = new RedisCacheService(config({}));

    await cache.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(quit).not.toHaveBeenCalled();
  });

  it('quits a connected client on shutdown', async () => {
    const cache = new RedisCacheService(config({}));
    status = 'ready';

    await cache.onModuleDestroy();

    expect(quit).toHaveBeenCalledOnce();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('falls back to disconnecting when quit fails', async () => {
    const cache = new RedisCacheService(config({}));
    status = 'reconnecting';
    quit.mockRejectedValueOnce(new Error('Connection is closed.'));

    await cache.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
