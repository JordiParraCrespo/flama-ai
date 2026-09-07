import { EmailService } from '@flama/backend-email';
import { QUEUE_NAMES } from '@flama/shared';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EmailJobMapper } from './email-job.mapper';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly mapper: EmailJobMapper,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'password-reset':
        await this.emailService.sendPasswordReset(
          this.mapper.toRecipient(job.data),
          this.mapper.toPasswordReset(job.data),
        );
        break;
      case 'email-verification':
        await this.emailService.sendEmailVerification(
          this.mapper.toRecipient(job.data),
          this.mapper.toEmailVerification(job.data),
        );
        break;
      case 'welcome':
        await this.emailService.sendWelcome(
          this.mapper.toRecipient(job.data),
          this.mapper.toWelcome(job.data),
        );
        break;
      case 'invitation':
        await this.emailService.sendInvitation(
          this.mapper.toRecipient(job.data),
          this.mapper.toInvitation(job.data),
        );
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
