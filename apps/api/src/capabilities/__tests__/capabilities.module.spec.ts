import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '../capabilities.module';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('resolveCapabilities', () => {
  it('reports everything off on a bare install', () => {
    const bare = resolveCapabilities(configWith({ 'email.provider': 'console' }));
    expect(Object.keys(bare)).toContain('email_delivery');
    expect(Object.entries(bare).filter(([, on]) => on)).toEqual([]);
  });

  it('requires both halves of an OAuth credential pair', () => {
    const partial = configWith({ 'oauth.google.clientId': 'id' });
    expect(resolveCapabilities(partial).google_oauth).toBe(false);

    const complete = configWith({
      'oauth.google.clientId': 'id',
      'oauth.google.clientSecret': 'secret',
    });
    expect(resolveCapabilities(complete).google_oauth).toBe(true);
    expect(resolveCapabilities(complete).github_oauth).toBe(false);
  });

  it('does not count the console email provider as delivery', () => {
    expect(resolveCapabilities(configWith({ 'email.provider': 'console' })).email_delivery).toBe(
      false,
    );
    expect(resolveCapabilities(configWith({ 'email.provider': 'nodemailer' })).email_delivery).toBe(
      false,
    );
    expect(
      resolveCapabilities(
        configWith({
          'email.provider': 'nodemailer',
          'email.smtpHost': 'smtp.example.com',
        }),
      ).email_delivery,
    ).toBe(true);
    expect(
      resolveCapabilities(
        configWith({
          'email.provider': 'resend',
          'email.resendApiKey': 're_123',
        }),
      ).email_delivery,
    ).toBe(true);
  });
});
