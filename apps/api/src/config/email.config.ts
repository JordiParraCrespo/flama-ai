import { ConsoleEmailService, type EmailDrivers } from '@flama/backend-email';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';
import { NodemailerEmailService } from './nodemailer-email.service';
import { ResendEmailService } from './resend-email.service';

/**
 * The email drivers this API can run on, by the name `EMAIL_PROVIDER` selects
 * one with. `app.module.ts` passes this map to `EmailModule`, and the schema
 * below accepts exactly its names, so an unknown provider fails at boot. A
 * driver with settings of its own reads them from a config section of its own.
 */
export const emailDrivers = {
  console: ConsoleEmailService,
  nodemailer: NodemailerEmailService,
  resend: ResendEmailService,
} satisfies EmailDrivers;

const driverNames = Object.keys(emailDrivers) as [
  keyof typeof emailDrivers,
  ...(keyof typeof emailDrivers)[],
];

// Which driver sends mail. `console`, the default, prints every email to the
// API log instead of delivering it.
const schema = z.object({
  provider: z.enum(driverNames).default('console'),
  // The sender address a delivering driver sends from.
  from: z.string().default('noreply@flama.dev'),
});

export const emailConfig = registerAs('email', () =>
  parseEnv('email', schema, {
    provider: 'EMAIL_PROVIDER',
    from: 'EMAIL_FROM',
  }),
);
