import '@flama/env/load';
import { randomUUID } from 'node:crypto';
// flama:begin mobile
import { expo } from '@better-auth/expo';
// flama:end mobile
// flama:plugins auth-imports
import { userAdditionalFields } from '@flama/auth';
import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { adminAc, defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { Pool } from 'pg';
import { orUndefined } from '../../config/env';
import { emailQueue, enqueueEmailBestEffort } from './email-queue.util';
import { accountLinking, socialProviders } from './oauth-providers.config';
// flama:plugins auth-plugin-imports

// flama:begin organizations
import { organizationPlugin, withActiveOrganization } from './organization-plugin.config';

// flama:end organizations

/**
 * Access-control roles for the admin plugin. Every name listed in `adminRoles`
 * must be defined here, so `superadmin` is given the full admin statement set
 * (including `impersonate-admins`, which plain `admin` lacks). `admin`/`user`
 * reuse Better Auth's built-in roles.
 */
const superadminAc = defaultAc.newRole({
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'impersonate-admins',
    'delete',
    'set-password',
    'get',
    'update',
  ],
  session: ['list', 'revoke', 'delete'],
});

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
// flama:begin mobile
const mobileScheme = process.env.MOBILE_SCHEME ?? 'flama';
// flama:end mobile
// flama:plugins auth-consts

// Read through `orUndefined` so a blank `DB_X=` means "unset" here exactly as
// it does in `database.config.ts`. Better Auth owns its own pool rather than
// TypeORM's, and two connections that disagree about the credentials would
// leave half the API unable to reach the database.
const pool = new Pool({
  host: orUndefined(process.env.DB_HOST) ?? 'localhost',
  port: Number.parseInt(orUndefined(process.env.DB_PORT) ?? '5432', 10),
  user: orUndefined(process.env.DB_USERNAME) ?? 'flama',
  password: orUndefined(process.env.DB_PASSWORD) ?? 'flama',
  database: orUndefined(process.env.DB_DATABASE) ?? 'flama',
});

// `pg` emits `error` on the pool when an *idle* client's connection drops — a
// database restart, a failover, an `idle_session_timeout`. Without a listener
// Node treats that as an uncaught exception and takes the process down, even
// though the pool recovers on its own by discarding the client.
pool.on('error', (error: Error) => {
  new Logger('BetterAuth').warn(`Idle database client dropped: ${error.message}`);
});

/**
 * Break-glass super admins, identified by user id, always pass the admin
 * plugin's authorization regardless of their `role`. Provide a comma-separated
 * list via `BETTER_AUTH_ADMIN_USER_IDS` so the first super admin can be
 * bootstrapped before any role is assigned.
 */
const adminUserIds = (process.env.BETTER_AUTH_ADMIN_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins: [
    frontendUrl,
    // flama:begin mobile
    `${mobileScheme}://`,
    // flama:end mobile
    // flama:plugins trusted-origins
  ],
  // Brute-force protection on the auth surface. `/api/auth/*` is mounted on the
  // HTTP adapter before Nest binds middleware, so the NestJS ThrottlerGuard
  // never sees these routes — Better Auth's own limiter is the only thing that
  // can guard them. `storage: 'database'` keeps the counters in Postgres so the
  // limit holds across API replicas and restarts, unlike the default per-process
  // memory store.
  //
  // Enabled in production (Better Auth's own default), where brute force is the
  // real threat. It stays off in development and test so an e2e suite that signs
  // in repeatedly from one IP is not throttled into failure; a non-production
  // deployment that faces the internet opts in with `AUTH_RATE_LIMIT_ENABLED=true`.
  rateLimit: {
    enabled:
      process.env.NODE_ENV === 'production' || process.env.AUTH_RATE_LIMIT_ENABLED === 'true',
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 3 },
      '/request-password-reset': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  advanced: {
    // Generate UUIDs so the ids stay compatible with the existing
    // `ParseUUIDPipe` validation on the `/users/:id` routes.
    database: {
      generateId: () => randomUUID(),
    },
  },
  session: {
    /**
     * Two columns on Better Auth's `session` table that say a row is not a
     * device.
     *
     * `DelegatedSessionAdapter` mints internal sessions so a scoped credential
     * can reach the façades that resolve their caller through Better Auth. Those rows are bridges, not sign-ins, and the profile and
     * security "Active sessions" lists read `delegated` to leave them out. It
     * is a persisted fact rather than the `userAgent` prefix they also carry:
     * a user agent is a label a client chooses, and a browser that sent
     * `flama-api-token/...` would otherwise hide itself from the very screen
     * that exists to expose it.
     *
     * `delegatedCredentialId` names the credential the row was minted for, so
     * re-minting one after its cache entry expires can delete the row it
     * supersedes instead of leaving a day of them behind.
     */
    additionalFields: {
      delegated: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: true,
        // Nothing outside the API has any use for it, and a session payload is
        // something clients hold on to.
        returned: false,
      },
      delegatedCredentialId: {
        type: 'string',
        required: false,
        input: true,
        returned: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Verification emails are sent on sign-up, but users can still sign in
    // immediately (set to `true` to hard-block unverified sign-ins).
    requireEmailVerification: false,
    // A reset is what someone does when they believe another person has their
    // account — a shared browser they forgot to sign out of, a stolen cookie.
    // Rotating the credential while leaving those sessions alive would defeat
    // the point, so every session is dropped and the user signs in again with
    // the new password (the web flow already lands on /login on success).
    // `changePassword` offers the same thing through `revokeOtherSessions`.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await emailQueue.add('password-reset', {
        to: user.email,
        userId: user.id,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailQueue.add('email-verification', {
        to: user.email,
        userId: user.id,
        url,
      });
    },
  },
  // The social sign-in providers, and how one joins an account that already
  // has its address.
  socialProviders,
  ...accountLinking,
  user: {
    // Declared in @flama/auth so the web/mobile clients' `inferAdditionalFields`
    // consume the same schema and cannot drift from the server.
    additionalFields: userAdditionalFields,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await enqueueEmailBestEffort('welcome', {
            to: user.email,
            userId: user.id,
            name: user.name,
          });
          // Assign the default `user` role in the RBAC join so new sign-ups get
          // their permissions from the same source as everyone else. Best-effort:
          // the AbilityFactory falls back to the legacy `user.role` column if the
          // join row is missing.
          try {
            await pool.query(
              `INSERT INTO "user_role" ("userId", "roleId")
                 SELECT $1, r."id" FROM "role" r WHERE r."name" = 'user'
                 ON CONFLICT DO NOTHING`,
              [user.id],
            );
          } catch {
            // Roles table not migrated yet, or transient error — ignore.
          }
          // Sign-up deliberately stops here: a new account holds nothing and
          // belongs nowhere until it creates a workspace or an invitation puts
          // it in one. This used to provision a personal organization with an
          // `owner` membership, which read as generosity and was the opposite —
          // the default `user` role grants none of the CRM, so the account
          // owned an organization it had no permission to open, and the
          // dashboard the app redirects to answered 403 on the first screen
          // after registering. Creating an organization is now what grants
          // access to it (see `OrganizationsService.create`), so the two are
          // one act instead of two mechanisms that disagreed.
        },
      },
    },
    // flama:begin organizations
    session: {
      create: {
        // Set the user's active organization (and its default workspace) on the
        // session so org-scoped requests work immediately after sign-in without
        // an explicit `setActive` round-trip. An account that belongs to no
        // organization yet leaves both null, and the web app sends it to
        // onboarding rather than to a dashboard it cannot read.
        before: (session) => withActiveOrganization(pool, session),
      },
    },
    // flama:end organizations
  },
  plugins: [
    // flama:begin mobile
    expo(),
    // flama:end mobile
    // flama:plugins auth-plugins
    admin({
      // Users whose `role` is one of these can call the admin plugin endpoints
      // (list/ban/impersonate/set-role/...). CASL still governs the app's own
      // REST routes; this only gates `/api/auth/admin/*`. Every admin role must
      // be defined in `roles` below (the built-in `admin`/`user` reuse Better
      // Auth's own access-control roles; `superadmin` gets the full statement set).
      roles: { superadmin: superadminAc, admin: adminAc, user: userAc },
      adminRoles: ['superadmin', 'admin'],
      defaultRole: 'user',
      adminUserIds,
      // Impersonation sessions last 1 hour by default; make it explicit.
      impersonationSessionDuration: 60 * 60,
    }),
    // flama:begin organizations
    organizationPlugin(frontendUrl),
    // flama:end organizations
    // Accepts `Authorization: Bearer <session token>`. Used by the API's own
    // auth guard, which mints a short-lived delegated session for a scoped
    // credential so the organization/admin façades — which resolve the caller
    // through Better Auth — keep working for API tokens.
    bearer(),
  ],
});

export type Auth = typeof auth;

/**
 * Release everything importing this module holds open.
 *
 * Configuring `auth` is a side effect of the import: it opens its own `pg` pool
 * (above), and `./email-queue` constructs a BullMQ `Queue`, whose Redis client
 * connects eagerly. Both keep the Node event loop alive, so a **short-lived
 * script** that imports `auth` — the seed — finishes its work and then hangs
 * forever instead of exiting. Long-running processes never need this: the API
 * holds both connections for its whole life and they die with it.
 */
export async function closeAuthConnections(): Promise<void> {
  await Promise.all([pool.end(), emailQueue.close()]);
}
