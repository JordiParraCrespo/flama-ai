import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async sendPasswordReset(to: string, token: string): Promise<void> {
    this.logger.log(`[PASSWORD RESET] To: ${to} | Token: ${token}`);
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    this.logger.log(`[EMAIL VERIFICATION] To: ${to} | Token: ${token}`);
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    this.logger.log(`[WELCOME] To: ${to} | Name: ${name}`);
  }
}
