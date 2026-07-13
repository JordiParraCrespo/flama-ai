import { render } from '@react-email/render';
import * as React from 'react';
import type { InvitationEmailParams } from './email.service';
import { EmailVerificationEmail } from './templates/email-verification';
import { InvitationEmail } from './templates/invitation';
import { PasswordResetEmail } from './templates/password-reset';
import { WelcomeEmail } from './templates/welcome';

export async function renderPasswordResetEmail(resetUrl: string): Promise<string> {
  return render(React.createElement(PasswordResetEmail, { resetUrl }));
}

export async function renderEmailVerificationEmail(verifyUrl: string): Promise<string> {
  return render(React.createElement(EmailVerificationEmail, { verifyUrl }));
}

export async function renderWelcomeEmail(name: string): Promise<string> {
  return render(React.createElement(WelcomeEmail, { name }));
}

export async function renderInvitationEmail(params: InvitationEmailParams): Promise<string> {
  return render(
    React.createElement(InvitationEmail, {
      organizationName: params.organizationName,
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl: params.url,
    }),
  );
}
