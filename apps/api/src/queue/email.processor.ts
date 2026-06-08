import { EmailService } from '@flama/backend-email';
import { QUEUE_NAMES } from '@flama/shared';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'password-reset':
        await this.emailService.sendPasswordReset(job.data.to, job.data.url);
        break;
      case 'email-verification':
        await this.emailService.sendEmailVerification(job.data.to, job.data.url);
        break;
      case 'welcome':
        await this.emailService.sendWelcome(job.data.to, job.data.name);
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
