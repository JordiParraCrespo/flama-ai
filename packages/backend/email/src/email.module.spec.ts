import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { ConsoleEmailService } from './console-email.service';
import { EmailModule } from './email.module';
import { EmailService } from './email.service';

/** The factory `EmailModule` binds to `EmailService`, called with `values` as config. */
function build(values: Record<string, unknown>) {
  const [{ useFactory: create }] = EmailModule.register({ console: ConsoleEmailService })
    .providers as FactoryProvider[];
  const config = {
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} is not configured`);
      return values[key];
    },
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return create(config);
}

describe('EmailModule.register', () => {
  it('provides and exports the abstract service as the token', () => {
    const module = EmailModule.register({ console: ConsoleEmailService });
    const [provider] = module.providers as FactoryProvider[];

    expect(module.exports).toEqual([EmailService]);
    expect(provider.provide).toBe(EmailService);
    expect(provider.inject).toEqual([ConfigService]);
  });

  it('builds the driver the config names', () => {
    expect(build({ 'email.provider': 'console' })).toBeInstanceOf(ConsoleEmailService);
  });

  it('refuses a name no driver is registered under', () => {
    // The app's config schema rejects it first; this is the module's own
    // guard, so a typo never falls through to some other driver.
    expect(() => build({ 'email.provider': 'sendgrid' })).toThrow(/No email driver named/);
    expect(() => build({ 'email.provider': 'toString' })).toThrow(/No email driver named/);
  });

  it('needs a provider to be configured', () => {
    expect(() => build({})).toThrow(/email.provider/);
  });
});
