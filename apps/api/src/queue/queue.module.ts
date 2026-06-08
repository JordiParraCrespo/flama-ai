import { QUEUE_NAMES } from '@flama/shared';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
    BullModule.registerQueue({ name: QUEUE_NAMES.FILE_PROCESSING }),
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
