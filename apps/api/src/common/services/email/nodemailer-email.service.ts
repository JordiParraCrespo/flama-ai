import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

@Injectable()
export class NodemailerEmailService extends EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Reset your password',
      html: `<p>Click <a href="${frontendUrl}/auth/reset-password?token=${token}">here</a> to reset your password.</p>`,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Verify your email',
      html: `<p>Click <a href="${frontendUrl}/auth/verify-email?token=${token}">here</a> to verify your email.</p>`,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM') || 'noreply@flama.dev',
      to,
      subject: 'Welcome to Flama',
      html: `<p>Welcome ${name}! Your account has been created.</p>`,
    });
  }
}
