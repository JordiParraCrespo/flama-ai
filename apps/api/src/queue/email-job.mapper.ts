import type {
  EmailVerificationEmailParams,
  InvitationEmailParams,
  PasswordResetEmailParams,
  WelcomeEmailParams,
} from '@flama/backend-email';

/** Copy shared by every transactional email. */
const BRAND_NAME = 'Flama';
const FOOTER = `You are receiving this email because you have an account at ${BRAND_NAME}.`;
const PASTE_LINK = 'If the button does not work, copy and paste this link into your browser:';

/** Organization roles as they read in an invitation. */
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  member: 'Member',
};

/**
 * Pure queue-payload → email-template mapper.
 *
 * The templates in `@flama/backend-email` render finished copy, so they depend
 * on neither Nest nor whichever delivery provider happens to be active. This
 * mapper is where a queued job's data becomes that copy, and it validates the
 * payload on the way: a malformed internal job fails loudly instead of sending
 * half an email.
 */
export class EmailJobMapper {
  toRecipient(input: unknown): string {
    return this.required(this.record(input), 'to');
  }

  toPasswordReset(input: unknown): PasswordResetEmailParams {
    const data = this.record(input);
    return {
      ...this.securityFrame('Reset your password', 'Use the link below to choose a new password.'),
      heading: 'Reset your password',
      body: 'We received a request to reset the password for your account. Use the button below to choose a new one.',
      actionLabel: 'Reset password',
      url: this.required(data, 'url'),
      helperText: 'This link expires soon. If it has, request a new one from the sign-in page.',
      fallbackLabel: PASTE_LINK,
      closingText:
        'If you did not ask to reset your password, you can ignore this email — your password stays the same.',
      recipientEmail: this.required(data, 'to'),
      footer: `${FOOTER}\nThis is a security email; it is sent even if you have opted out of product updates.`,
    };
  }

  toEmailVerification(input: unknown): EmailVerificationEmailParams {
    const data = this.record(input);
    return {
      ...this.securityFrame('Verify your email', 'Confirm this address to finish setting up.'),
      heading: 'Verify your email address',
      body: 'Confirm that this is your address and your account is ready to use.',
      actionLabel: 'Verify email',
      url: this.required(data, 'url'),
      helperText: 'This link expires soon. If it has, request a new one from your account.',
      fallbackLabel: PASTE_LINK,
      closingText: 'If you did not create an account, you can safely ignore this email.',
      recipientEmail: this.required(data, 'to'),
      footer: `${FOOTER}\nThis is a security email; it is sent even if you have opted out of product updates.`,
    };
  }

  toWelcome(input: unknown): WelcomeEmailParams {
    const data = this.record(input);
    const name = this.required(data, 'name');
    return {
      ...this.frame(`Welcome to ${BRAND_NAME}`, 'Your account is ready.'),
      eyebrow: 'Welcome',
      heading: `Welcome to ${BRAND_NAME}`,
      greeting: `Hi ${name},`,
      body: "Your account has been created successfully. We're excited to have you on board.",
      supportText: 'If you have any questions, feel free to reach out to our support team.',
      signoff: `— The ${BRAND_NAME} team`,
    };
  }

  toInvitation(input: unknown): InvitationEmailParams {
    const data = this.record(input);
    const organizationName = this.required(data, 'organizationName');
    const inviterName = this.required(data, 'inviterName');
    const role = this.required(data, 'role');
    const roleLabel = ROLE_LABELS[role] ?? role;

    return {
      ...this.frame(
        `You've been invited to ${organizationName}`,
        `${inviterName} has invited you to join ${organizationName}.`,
      ),
      heroLabel: `${BRAND_NAME} · Invitation`,
      heading: `Join ${organizationName}`,
      body: 'Accept the invitation to start working with your team.',
      inviterInitials: this.initials(inviterName),
      inviterLine: `${inviterName} invited you`,
      roleLine: `You will join as ${roleLabel}`,
      benefitsTitle: 'What you get',
      benefits: [
        'Everything your team has filed in this workspace',
        'A place to collaborate with the people who invited you',
        'One account for every workspace you belong to',
      ],
      actionLabel: 'Accept invitation',
      url: this.required(data, 'url'),
      expiryText: 'This invitation expires in 48 hours.',
      fallbackLabel: PASTE_LINK,
      ignoreText: 'If you were not expecting this invitation, you can safely ignore this email.',
    };
  }

  private frame(subject: string, preview: string) {
    return { locale: 'en', subject, preview, brandName: BRAND_NAME, footer: FOOTER };
  }

  private securityFrame(subject: string, preview: string) {
    return this.frame(subject, preview);
  }

  private initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  private record(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Email job data must be an object');
    }
    return input as Record<string, unknown>;
  }

  private required(data: Record<string, unknown>, key: string): string {
    const value = data[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Email job is missing ${key}`);
    }
    return value;
  }
}
