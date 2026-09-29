import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

const schema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  // **Required** — the app must fail fast and loud at boot without it. Only
  // keys whose absence removes an optional feature (OAuth, SMTP)
  // get the optional-capability treatment; see `capabilities.module.ts`.
  betterAuthSecret: z.string().min(8),
  betterAuthUrl: z.string().url().default('http://localhost:3001'),
  frontendUrl: z.string().url().default('http://localhost:3000'),
  // flama:begin mobile
  mobileScheme: z.string().default('flama'),
  // flama:end mobile
  // flama:plugins config-schema
  // Base of the RFC 7807 `type` URIs in error responses. Point it at wherever
  // this deployment documents its error catalog.
  errorTypeBaseUrl: z.string().url().default('https://flama.dev/errors'),
  // Number of reverse-proxy hops in front of the API (Express `trust proxy`).
  // 0 = trust none (direct connection). Behind nginx/ingress set it to the
  // hop count so `req.ip` is the real client — the throttler keys on it and
  // API-token IP allowlists and audit logs record it. Never blindly trust all
  // proxies (`true`), which lets a client spoof `X-Forwarded-For`.
  trustProxy: z.coerce.number().int().min(0).default(0),
});

export const appConfig = registerAs('app', () =>
  parseEnv('app', schema, {
    port: 'PORT',
    nodeEnv: 'NODE_ENV',
    betterAuthSecret: 'BETTER_AUTH_SECRET',
    betterAuthUrl: 'BETTER_AUTH_URL',
    frontendUrl: 'FRONTEND_URL',
    // flama:begin mobile
    mobileScheme: 'MOBILE_SCHEME',
    // flama:end mobile
    // flama:plugins config-env
    errorTypeBaseUrl: 'ERROR_TYPE_BASE_URL',
    trustProxy: 'TRUST_PROXY',
  }),
);
