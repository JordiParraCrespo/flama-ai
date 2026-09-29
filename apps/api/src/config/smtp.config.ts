import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

/**
 * The SMTP email driver's settings, read when `EMAIL_PROVIDER=nodemailer`.
 * Optional capability config: a blank or whitespace-only env var normalizes to
 * undefined, so the capability registry never reports email delivery as
 * configured on an unusable transport.
 */
const schema = z.object({
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
});

export const smtpConfig = registerAs('smtp', () =>
  parseEnv('smtp', schema, {
    host: 'SMTP_HOST',
    port: 'SMTP_PORT',
    user: 'SMTP_USER',
    pass: 'SMTP_PASS',
  }),
);
