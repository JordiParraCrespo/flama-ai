import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '../capabilities.module';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('email_delivery', () => {
  it('is off on the console driver, which only prints to the log', () => {
    expect(resolveCapabilities(configWith({ 'email.provider': 'console' })).email_delivery).toBe(
      false,
    );
  });

  it('is on for SMTP only with a host to send through', () => {
    expect(resolveCapabilities(configWith({ 'email.provider': 'nodemailer' })).email_delivery).toBe(
      false,
    );
    expect(
      resolveCapabilities(
        configWith({ 'email.provider': 'nodemailer', 'smtp.host': 'smtp.example.com' }),
      ).email_delivery,
    ).toBe(true);
  });

  it('is on for Resend only with an API key', () => {
    expect(resolveCapabilities(configWith({ 'email.provider': 'resend' })).email_delivery).toBe(
      false,
    );
    expect(
      resolveCapabilities(configWith({ 'email.provider': 'resend', 'resend.apiKey': 're_123' }))
        .email_delivery,
    ).toBe(true);
  });
});
