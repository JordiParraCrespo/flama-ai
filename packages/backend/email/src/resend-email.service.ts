import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailService } from './email.service';
import {
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from './render';

@Injectable()
export class ResendEmailService extends EmailService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    super();
    this.resend = new Resend(this.configService.get('email.resendApiKey'));
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    const html = await renderPasswordResetEmail(resetUrl);
    await this.resend.emails.send({
      from: this.configService.get('email.from') || 'noreply@flama.dev',
      to,
      subject: 'Reset your password',
      html,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`;
    const html = await renderEmailVerificationEmail(verifyUrl);
    await this.resend.emails.send({
      from: this.configService.get('email.from') || 'noreply@flama.dev',
      to,
      subject: 'Verify your email',
      html,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    const html = await renderWelcomeEmail(name);
    await this.resend.emails.send({
      from: this.configService.get('email.from') || 'noreply@flama.dev',
      to,
      subject: 'Welcome to Flama',
      html,
    });
  }
}
