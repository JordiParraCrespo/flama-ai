import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

const schema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  // **Required** — the app must fail fast and loud at boot without it. Only
  // keys whose absence removes an optional feature (OAuth, Stripe, S3, SMTP)
  // get the optional-capability treatment; see `capabilities.module.ts`.
  betterAuthSecret: z.string().min(8),
  betterAuthUrl: z.string().url().default('http://localhost:3001'),
  frontendUrl: z.string().url().default('http://localhost:3000'),
  mobileScheme: z.string().default('flama'),
  // Base of the RFC 7807 `type` URIs in error responses. Point it at wherever
  // this deployment documents its error catalog.
  errorTypeBaseUrl: z.string().url().default('https://flama.dev/errors'),
});

export const appConfig = registerAs('app', () =>
  parseEnv('app', schema, {
    port: 'PORT',
    nodeEnv: 'NODE_ENV',
    betterAuthSecret: 'BETTER_AUTH_SECRET',
    betterAuthUrl: 'BETTER_AUTH_URL',
    frontendUrl: 'FRONTEND_URL',
    mobileScheme: 'MOBILE_SCHEME',
    errorTypeBaseUrl: 'ERROR_TYPE_BASE_URL',
  }),
);
