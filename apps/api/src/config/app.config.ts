import { isAbsolute, resolve } from 'node:path';
import { findWorkspaceRoot } from '@flama/env';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

/**
 * `LOG_FILE` as the path the loggers write to. **Optional**: a file the API
 * also writes its log lines to, as JSON, for a shipper to tail
 * (`pnpm monitoring:up` runs Grafana Alloy over `.logs/`, into Loki); unset
 * or blank, logs go to stdout only. A relative path is taken from the
 * repository root, so `.logs/api.log` is the same file wherever the API is
 * started from. Read once, in `app.module.ts`, for both loggers.
 */
export function resolveLogFile(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return isAbsolute(value) ? value : resolve(findWorkspaceRoot() ?? process.cwd(), value);
}

const schema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  // **Required** — the app must fail fast and loud at boot without it. Only
  // keys whose absence removes an optional feature (an integration's key)
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
