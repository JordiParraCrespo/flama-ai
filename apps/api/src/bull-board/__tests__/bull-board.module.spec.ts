import type { ConfigService } from '@nestjs/config';
import type { HttpAdapterHost } from '@nestjs/core';
import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { BullBoardModule } from '../bull-board.module';

vi.mock('@bull-board/api', () => ({ createBullBoard: vi.fn() }));
vi.mock('@bull-board/api/bullMQAdapter', () => ({ BullMQAdapter: class {} }));
vi.mock('@bull-board/express', () => ({
  ExpressAdapter: class {
    setBasePath = vi.fn();
    getRouter = vi.fn(() => 'the-router');
  },
}));

function init(values: Record<string, string>) {
  const use = vi.fn();
  const adapterHost = {
    httpAdapter: { getInstance: () => ({ use }) },
  } as unknown as HttpAdapterHost;
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  const queue = {} as Queue;
  new BullBoardModule(adapterHost, config, queue, queue).onModuleInit();
  return use;
}

describe('BullBoardModule', () => {
  it('mounts the dashboard at /admin/queues when both credentials are set', () => {
    const use = init({
      'app.bullBoardUsername': 'operator',
      'app.bullBoardPassword': 'correct horse battery staple',
    });

    expect(use).toHaveBeenCalledWith('/admin/queues', expect.any(Function), 'the-router');
  });

  it('mounts nothing when either credential is missing', () => {
    expect(init({})).not.toHaveBeenCalled();
    expect(init({ 'app.bullBoardUsername': 'operator' })).not.toHaveBeenCalled();
  });
});
