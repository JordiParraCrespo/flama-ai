import { QUEUE_NAMES } from '@flama/shared';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { EmailJobMapper } from './email-job.mapper';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
    BullModule.registerQueue({ name: QUEUE_NAMES.FILE_PROCESSING }),
  ],
  providers: [EmailProcessor, EmailJobMapper],
  exports: [BullModule],
})
export class QueueModule {}
