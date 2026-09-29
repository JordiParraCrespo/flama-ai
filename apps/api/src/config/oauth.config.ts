import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

/**
 * The social sign-in providers' credentials, a part per provider: Google and
 * GitHub. Both readers take them from here: Better Auth, which runs a provider
 * once both halves are set (`auth/infrastructure/oauth-providers.config.ts`)
 * and derives its callback URL as
 * `${BETTER_AUTH_URL}/api/auth/callback/<provider>`, and the capability table,
 * which reports the same as `google_oauth` / `github_oauth`.
 *
 * Every key here is **optional capability config**: a self-hoster may run
 * without any OAuth provider, so a missing key disables that provider — it
 * never fails boot, and it never falls back to a sentinel value. Absence is
 * `undefined`, so a consumer that forgets to handle it fails to compile
 * instead of handing a fake client id to the provider.
 */
const schema = z.object({
  google: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
  github: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
});

/**
 * The section, read from the environment. Better Auth is built when its module
 * loads, before Nest reads any config, so it calls this directly.
 */
export function readOAuthConfig() {
  return parseEnv('oauth', schema, {
    'google.clientId': 'GOOGLE_CLIENT_ID',
    'google.clientSecret': 'GOOGLE_CLIENT_SECRET',
    'github.clientId': 'GITHUB_CLIENT_ID',
    'github.clientSecret': 'GITHUB_CLIENT_SECRET',
  });
}

export const oauthConfig = registerAs('oauth', readOAuthConfig);
