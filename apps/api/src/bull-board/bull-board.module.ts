import { QUEUE_NAMES } from '@flama/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { Queue } from 'bullmq';
import { QueueModule } from '../queue/queue.module';
import { type BullBoardHost, mountBullBoard } from './infrastructure/bull-board.adapter';

/**
 * The Bull Board dashboard over the API's queues, at `/admin/queues`. It is
 * mounted only when both `BULL_BOARD_USERNAME` and `BULL_BOARD_PASSWORD` are
 * configured, and then behind HTTP Basic auth; the boot log says which.
 *
 * It mounts when the module initialises, which Nest does after it has
 * registered its own routes and before its not-found handler, so the dashboard
 * is reachable and every other path still 404s as before.
 */
@Module({ imports: [QueueModule] })
export class BullBoardModule implements OnModuleInit {
  private readonly logger = new Logger('BullBoard');

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FILE_PROCESSING) private readonly fileProcessingQueue: Queue,
  ) {}

  onModuleInit(): void {
    const username = this.configService.get<string>('app.bullBoardUsername');
    const password = this.configService.get<string>('app.bullBoardPassword');
    const mounted = mountBullBoard(
      this.adapterHost.httpAdapter.getInstance<BullBoardHost>(),
      [this.emailQueue, this.fileProcessingQueue],
      username && password ? { auth: { username, password } } : {},
    );
    this.logger.log(
      mounted
        ? 'Bull Board dashboard mounted at /admin/queues (Basic auth)'
        : 'Bull Board dashboard disabled (set BULL_BOARD_USERNAME and BULL_BOARD_PASSWORD to enable)',
    );
  }
}
