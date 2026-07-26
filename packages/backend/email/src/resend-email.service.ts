import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { type CreateEmailOptions, Resend } from 'resend';
import { EmailService, type InvitationEmailParams } from './email.service';
import {
  renderEmailVerificationEmail,
  renderInvitationEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from './render';

@Injectable()
export class ResendEmailService extends EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    super();
    this.resend = new Resend(this.configService.get('email.resendApiKey'));
  }

  /**
   * Send an email through Resend.
   *
   * `resend.emails.send()` resolves with `{ data, error }` instead of throwing,
   * so a failure (misconfigured sender domain, rate limit, invalid recipient)
   * would otherwise be silently swallowed. Inspect the response and throw so the
   * failure propagates to the caller (e.g. the email queue processor) instead of
   * being reported as a successful send.
   */
  private async send(options: CreateEmailOptions): Promise<void> {
    const { data, error } = await this.resend.emails.send(options);

    if (error) {
      this.logger.error(
        `Failed to send "${options.subject}" email to ${options.to}: ${error.message}`,
      );
      throw new Error(`Resend failed to send email: ${error.message}`);
    }

    this.logger.debug(`Sent "${options.subject}" email to ${options.to} (id: ${data?.id})`);
  }

  private get from(): string {
    return this.configService.get('email.from') || 'noreply@flama.dev';
  }

  async sendPasswordReset(to: string, url: string): Promise<void> {
    const html = await renderPasswordResetEmail(url);
    await this.send({
      from: this.from,
      to,
      subject: 'Reset your password',
      html,
    });
  }

  async sendEmailVerification(to: string, url: string): Promise<void> {
    const html = await renderEmailVerificationEmail(url);
    await this.send({
      from: this.from,
      to,
      subject: 'Verify your email',
      html,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    const html = await renderWelcomeEmail(name);
    await this.send({
      from: this.from,
      to,
      subject: 'Welcome to Flama',
      html,
    });
  }

  async sendInvitation(to: string, params: InvitationEmailParams): Promise<void> {
    const html = await renderInvitationEmail(params);
    await this.send({
      from: this.from,
      to,
      subject: `You've been invited to join ${params.organizationName}`,
      html,
    });
  }
}
