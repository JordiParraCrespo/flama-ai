import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { emailQueue } from './email-queue';

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const mobileScheme = process.env.MOBILE_SCHEME ?? 'flama';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  user: process.env.DB_USERNAME ?? 'flama',
  password: process.env.DB_PASSWORD ?? 'flama',
  database: process.env.DB_DATABASE ?? 'flama',
});

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const githubConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/**
 * Splits a provider-supplied display name into first/last name parts so that
 * OAuth sign-ups populate the same `firstName` / `lastName` fields used by the
 * email/password flow and the rest of the app.
 */
function splitName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'User', lastName: '' };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
  database: pool,
  trustedOrigins: [frontendUrl, `${mobileScheme}://`],
  advanced: {
    // Generate UUIDs so the ids stay compatible with the existing
    // `ParseUUIDPipe` validation on the `/users/:id` routes.
    database: {
      generateId: () => randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    // Verification emails are sent on sign-up, but users can still sign in
    // immediately (set to `true` to hard-block unverified sign-ins).
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await emailQueue.add('password-reset', { to: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailQueue.add('email-verification', { to: user.email, url });
    },
  },
  socialProviders: {
    ...(googleConfigured && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        mapProfileToUser: (profile) => splitName(profile.name),
      },
    }),
    ...(githubConfigured && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        mapProfileToUser: (profile) => splitName(profile.name),
      },
    }),
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', required: true, input: true },
      lastName: { type: 'string', required: true, input: true },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await emailQueue.add('welcome', { to: user.email, name: user.name });
        },
      },
    },
  },
  plugins: [expo()],
});

export type Auth = typeof auth;
