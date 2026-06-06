import { QUEUE_NAMES } from '@flama/shared';
import { Queue } from 'bullmq';

/**
 * Standalone BullMQ queue used by the Better Auth instance to enqueue
 * transactional emails (password reset, email verification, welcome).
 *
 * Better Auth is configured outside of the NestJS DI container, so it cannot
 * inject the queue provided by `@nestjs/bullmq`. Instead it pushes jobs onto
 * the same Redis queue, which is consumed by the existing `EmailProcessor`
 * worker registered in `QueueModule`.
 */
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
});
