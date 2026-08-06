import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { orUndefined } from './env';

// Optional-capability config: with no transport settings the console provider
// prints emails to stdout. Transport keys are genuinely optional — a blank or
// whitespace-only env var normalizes to undefined so the capability registry
// never reports email delivery as configured on an unusable transport.
const schema = z.object({
  provider: z.enum(['console', 'nodemailer', 'resend']).default('console'),
  from: z.string().default('noreply@flama.dev'),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  resendApiKey: z.string().optional(),
});

export const emailConfig = registerAs('email', () => {
  return schema.parse({
    provider: orUndefined(process.env.EMAIL_PROVIDER),
    from: orUndefined(process.env.EMAIL_FROM),
    smtpHost: orUndefined(process.env.SMTP_HOST),
    smtpPort: orUndefined(process.env.SMTP_PORT),
    smtpUser: orUndefined(process.env.SMTP_USER),
    smtpPass: orUndefined(process.env.SMTP_PASS),
    resendApiKey: orUndefined(process.env.RESEND_API_KEY),
  });
});
