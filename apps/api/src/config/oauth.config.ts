import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * OAuth provider credentials. Better Auth reads these from the environment
 * directly (see `auth.ts`) and derives the callback URLs as
 * `${BETTER_AUTH_URL}/api/auth/callback/<provider>`. This config object is kept
 * for visibility / validation of the configured providers.
 */
const schema = z.object({
  google: z.object({
    clientId: z.string().default('not-set'),
    clientSecret: z.string().default('not-set'),
  }),
  github: z.object({
    clientId: z.string().default('not-set'),
    clientSecret: z.string().default('not-set'),
  }),
});

export const oauthConfig = registerAs('oauth', () => {
  return schema.parse({
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  });
});
