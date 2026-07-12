import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { Pool } from "pg";
import { emailQueue } from "./email-queue";

/**
 * Access-control roles for the admin plugin. Every name listed in `adminRoles`
 * must be defined here, so `superadmin` is given the full admin statement set
 * (including `impersonate-admins`, which plain `admin` lacks). `admin`/`user`
 * reuse Better Auth's built-in roles.
 */
const superadminAc = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const mobileScheme = process.env.MOBILE_SCHEME ?? "flama";

const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number.parseInt(process.env.DB_PORT ?? "5432", 10),
  user: process.env.DB_USERNAME ?? "flama",
  password: process.env.DB_PASSWORD ?? "flama",
  database: process.env.DB_DATABASE ?? "flama",
});

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const githubConfigured = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

/**
 * Break-glass super admins, identified by user id, always pass the admin
 * plugin's authorization regardless of their `role`. Provide a comma-separated
 * list via `BETTER_AUTH_ADMIN_USER_IDS` so the first super admin can be
 * bootstrapped before any role is assigned.
 */
const adminUserIds = (process.env.BETTER_AUTH_ADMIN_USER_IDS ?? "")
  .split(",")
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
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "User", lastName: "" };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(" ") };
}

/** Build a URL-safe slug and make it unique with a short random suffix. */
function slugify(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${cleaned || "org"}-${randomUUID().slice(0, 8)}`;
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
  const displayName = user.name?.trim() || user.email.split("@")[0];
  const orgName = `${displayName}'s Organization`;
  const slug = slugify(displayName);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    // Organization tables not migrated yet, or a transient error — ignore so
    // sign-up still succeeds. The user can create an organization later.
  } finally {
    client.release();
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  basePath: "/api/auth",
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
      await emailQueue.add("password-reset", { to: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailQueue.add("email-verification", { to: user.email, url });
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
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
      isActive: {
        type: "boolean",
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
          await emailQueue.add("welcome", { to: user.email, name: user.name });
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
      // be defined in `roles` below.
      ac: defaultAc,
      roles: { superadmin: superadminAc, admin: adminAc, user: userAc },
      adminRoles: ["superadmin", "admin"],
      defaultRole: "user",
      adminUserIds,
      // Impersonation sessions last 1 hour by default; make it explicit.
      impersonationSessionDuration: 60 * 60,
    }),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
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
        await emailQueue.add("invitation", {
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          role: data.role,
          url: acceptUrl,
        });
      },
    }),
  ],
});

export type Auth = typeof auth;
