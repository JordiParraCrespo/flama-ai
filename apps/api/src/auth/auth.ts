import '@flama/env/load';
import { randomUUID } from 'node:crypto';
import { expo } from '@better-auth/expo';
import { DEFAULT_OAUTH_SCOPES, SCOPES } from '@flama/shared';
import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { admin, bearer, mcp, organization } from 'better-auth/plugins';
import { adminAc, defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { Pool } from 'pg';
import { emailQueue, enqueueEmailBestEffort } from './email-queue';

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

/** OIDC's standard scopes plus this deployment's own permission catalog. */
const OAUTH_SCOPES_SUPPORTED = ['openid', 'profile', 'email', 'offline_access', ...SCOPES];

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const mobileScheme = process.env.MOBILE_SCHEME ?? 'flama';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  user: process.env.DB_USERNAME ?? 'flama',
  password: process.env.DB_PASSWORD ?? 'flama',
  database: process.env.DB_DATABASE ?? 'flama',
});

// `pg` emits `error` on the pool when an *idle* client's connection drops — a
// database restart, a failover, an `idle_session_timeout`. Without a listener
// Node treats that as an uncaught exception and takes the process down, even
// though the pool recovers on its own by discarding the client.
pool.on('error', (error: Error) => {
  new Logger('BetterAuth').warn(`Idle database client dropped: ${error.message}`);
});

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const githubConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

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

/** Build a URL-safe slug and make it unique with a short random suffix. */
function slugify(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${cleaned || 'org'}-${randomUUID().slice(0, 8)}`;
}

/**
 * Provisions a personal organization for a brand-new user: the organization,
 * an `owner` membership, and a default "General" workspace (Better Auth team).
 *
 * Done with raw SQL rather than the org API because there is no authenticated
 * session at `user.create.after` time. Best-effort — mirrors the RBAC default
 * role assignment below: a missing organization table (pre-migration) or a
 * transient error must not break sign-up.
 */
async function provisionPersonalOrganization(user: {
  id: string;
  name?: string | null;
  email: string;
}): Promise<void> {
  const orgId = randomUUID();
  const memberId = randomUUID();
  const teamId = randomUUID();
  const teamMemberId = randomUUID();
  const displayName = user.name?.trim() || user.email.split('@')[0];
  const orgName = `${displayName}'s Organization`;
  const slug = slugify(displayName);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "organization" ("id", "name", "slug", "createdAt") VALUES ($1, $2, $3, now())`,
      [orgId, orgName, slug],
    );
    await client.query(
      `INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt")
         VALUES ($1, $2, $3, 'owner', now())`,
      [memberId, orgId, user.id],
    );
    await client.query(
      `INSERT INTO "team" ("id", "name", "organizationId", "createdAt") VALUES ($1, 'General', $2, now())`,
      [teamId, orgId],
    );
    await client.query(
      `INSERT INTO "teamMember" ("id", "teamId", "userId", "createdAt") VALUES ($1, $2, $3, now())`,
      [teamMemberId, teamId, user.id],
    );
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    // Organization tables not migrated yet, or a transient error — ignore so
    // sign-up still succeeds. The user can create an organization later.
  } finally {
    client.release();
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
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
          await enqueueEmailBestEffort('welcome', {
            to: user.email,
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
          // Give every new user a personal organization + default workspace so
          // the app is multi-tenant "by default".
          await provisionPersonalOrganization(user);
        },
      },
    },
    session: {
      create: {
        // Set the user's active organization (and its default workspace) on the
        // session so org-scoped requests work immediately after sign-in without
        // an explicit `setActive` round-trip.
        before: async (session) => {
          try {
            const { rows } = await pool.query<{
              organizationId: string;
              teamId: string | null;
            }>(
              `SELECT m."organizationId", t."id" AS "teamId"
                 FROM "member" m
                 LEFT JOIN "team" t ON t."organizationId" = m."organizationId"
                WHERE m."userId" = $1
                ORDER BY m."createdAt" ASC, t."createdAt" ASC
                LIMIT 1`,
              [session.userId],
            );
            const active = rows[0];
            if (!active) return;
            return {
              data: {
                ...session,
                activeOrganizationId: active.organizationId,
                activeTeamId: active.teamId ?? undefined,
              },
            };
          } catch {
            // Organization tables not migrated yet — leave the session as-is.
            return;
          }
        },
      },
    },
  },
  plugins: [
    expo(),
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
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48,
      // "Workspaces" are modelled on Better Auth teams.
      teams: {
        enabled: true,
        // We provision the default workspace ourselves in the sign-up hook, so
        // let organizations be created without forcing a default team.
        allowRemovingAllTeams: false,
      },
      sendInvitationEmail: async (data) => {
        const acceptUrl = `${frontendUrl}/accept-invitation?id=${data.id}`;
        await emailQueue.add('invitation', {
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          role: data.role,
          url: acceptUrl,
        });
      },
    }),
    // Accepts `Authorization: Bearer <session token>`. Used by the API's own
    // auth guard, which mints a short-lived delegated session for a scoped
    // credential so the organization/admin façades — which resolve the caller
    // through Better Auth — keep working for API tokens and MCP clients.
    bearer(),
    // Turns the app into an OAuth 2.1 provider for MCP clients: discovery
    // metadata, dynamic client registration, authorization and token endpoints.
    // Clients ask for scopes from the shared catalog and the user approves (or
    // narrows) them on the consent screen.
    mcp({
      loginPage: `${frontendUrl}/login`,
      // The plugin hands *these* options — not `oidcConfig` — to the discovery
      // metadata builder, which otherwise advertises only the OIDC standard
      // scopes. Publishing the catalog here is what lets an MCP client see
      // which permissions this deployment actually offers.
      ...({ metadata: { scopes_supported: OAUTH_SCOPES_SUPPORTED } } as object),
      oidcConfig: {
        loginPage: `${frontendUrl}/login`,
        scopes: [...SCOPES],
        defaultScope: DEFAULT_OAUTH_SCOPES.join(' '),
        consentPage: `${frontendUrl}/oauth/consent`,
        // MCP clients are public clients that register themselves on first use.
        allowDynamicClientRegistration: true,
        requirePKCE: true,
        storeClientSecret: 'hashed',
        accessTokenExpiresIn: 60 * 60,
        refreshTokenExpiresIn: 60 * 60 * 24 * 30,
        // Mirrored here for the OIDC discovery document, which is built from
        // `oidcConfig` rather than the plugin options above.
        metadata: { scopes_supported: OAUTH_SCOPES_SUPPORTED },
      },
    }),
  ],
});

export type Auth = typeof auth;
