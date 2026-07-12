import { Injectable, Logger } from '@nestjs/common';
import { EmailService, type InvitationEmailParams } from './email.service';

@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async sendPasswordReset(to: string, url: string): Promise<void> {
    this.logger.log(`[PASSWORD RESET] To: ${to} | URL: ${url}`);
  }

  async sendEmailVerification(to: string, url: string): Promise<void> {
    this.logger.log(`[EMAIL VERIFICATION] To: ${to} | URL: ${url}`);
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    this.logger.log(`[WELCOME] To: ${to} | Name: ${name}`);
  }

  async sendInvitation(to: string, params: InvitationEmailParams): Promise<void> {
    this.logger.log(
      `[INVITATION] To: ${to} | Org: ${params.organizationName} | Role: ${params.role} | URL: ${params.url}`,
    );
  }
}
