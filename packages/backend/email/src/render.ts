import { render } from '@react-email/render';
import * as React from 'react';
import { EmailVerificationEmail } from './templates/email-verification';
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
