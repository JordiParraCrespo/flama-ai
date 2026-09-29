import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

/**
 * The Resend email driver's settings, read when `EMAIL_PROVIDER=resend`.
 * Optional capability config: a blank or whitespace-only key normalizes to
 * undefined, so the capability registry never reports email delivery as
 * configured on an unusable key.
 */
const schema = z.object({
  apiKey: z.string().optional(),
});

export const resendConfig = registerAs('resend', () =>
  parseEnv('resend', schema, {
    apiKey: 'RESEND_API_KEY',
  }),
);
