import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import {
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from './render';

@Injectable()
export class NodemailerEmailService extends EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.smtpHost'),
      port: this.configService.get('email.smtpPort'),
      auth: {
        user: this.configService.get('email.smtpUser'),
        pass: this.configService.get('email.smtpPass'),
      },
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    const html = await renderPasswordResetEmail(resetUrl);
    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Reset your password',
      html,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`;
    const html = await renderEmailVerificationEmail(verifyUrl);
    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Verify your email',
      html,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    const html = await renderWelcomeEmail(name);
    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Welcome to Flama',
      html,
    });
  }
}
