import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';

export function setupBullBoard(
  app: INestApplication,
  queueNames: string[],
  basePath = '/admin/queues',
): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  const queues = queueNames.map((name) => {
    const queue = app.get<Queue>(getQueueToken(name));
    return new BullMQAdapter(queue);
  });

  createBullBoard({ queues, serverAdapter });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.use(basePath, serverAdapter.getRouter());
}
