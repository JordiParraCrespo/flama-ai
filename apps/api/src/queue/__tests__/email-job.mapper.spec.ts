import { describe, expect, it } from 'vitest';
import { EmailJobMapper } from '../email-job.mapper';

describe('EmailJobMapper', () => {
  const mapper = new EmailJobMapper();

  it('builds password reset copy around the reset link', () => {
    const email = mapper.toPasswordReset({ to: 'ana@example.com', url: 'https://x/reset' });

    expect(email.subject).toBe('Reset your password');
    expect(email.url).toBe('https://x/reset');
    expect(email.recipientEmail).toBe('ana@example.com');
    expect(email.footer).toContain('security email');
  });

  it('labels the invitation with the organization, the inviter and the role', () => {
    const email = mapper.toInvitation({
      to: 'ana@example.com',
      organizationName: 'Acme',
      inviterName: 'Adri Rodrigo',
      role: 'member',
      url: 'https://x/invite',
    });

    expect(email.subject).toBe("You've been invited to Acme");
    expect(email.heading).toBe('Join Acme');
    expect(email.roleLine).toBe('You will join as Member');
    expect(email.inviterInitials).toBe('AR');
    expect(email.url).toBe('https://x/invite');
  });

  it('passes an unknown organization role through verbatim', () => {
    const email = mapper.toInvitation({
      to: 'ana@example.com',
      organizationName: 'Acme',
      inviterName: 'Adri',
      role: 'editor',
      url: 'https://x/invite',
    });

    expect(email.roleLine).toBe('You will join as editor');
  });

  it('rejects malformed internal jobs instead of sending partial mail', () => {
    expect(() => mapper.toRecipient({ userId: 'user-1' })).toThrow('Email job is missing to');
    expect(() => mapper.toWelcome({ to: 'ana@example.com' })).toThrow('Email job is missing name');
  });
});
