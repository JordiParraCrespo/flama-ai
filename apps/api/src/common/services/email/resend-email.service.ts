import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailService } from './email.service';

@Injectable()
export class ResendEmailService extends EmailService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    super();
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Reset your password',
      html: `<p>Click <a href="${frontendUrl}/auth/reset-password?token=${token}">here</a> to reset your password.</p>`,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Verify your email',
      html: `<p>Click <a href="${frontendUrl}/auth/verify-email?token=${token}">here</a> to verify your email.</p>`,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Welcome to Flama',
      html: `<p>Welcome ${name}! Your account has been created.</p>`,
    });
  }
}
