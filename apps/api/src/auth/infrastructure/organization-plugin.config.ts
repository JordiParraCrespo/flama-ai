import { organizationSharedOptions } from '@flama/auth';
import { organization } from 'better-auth/plugins';
import type { Pool } from 'pg';
import { emailQueue } from './email-queue.util';
import { buildInvitationUrl } from './invitation-url.util';

/**
 * Better Auth's organization plugin as Flama configures it: organizations,
 * members, invitations and workspaces (Better Auth teams). Its own file so a
 * project without organizations drops it whole, and `better-auth.config.ts`
 * keeps one fenced line where it used to hold the plugin.
 */
export function organizationPlugin(frontendUrl: string) {
  return organization({
    allowUserToCreateOrganization: true,
    creatorRole: 'owner',
    membershipLimit: 100,
    invitationExpiresIn: 60 * 60 * 48,
    // Invitation ids use random UUIDs through advanced.database.generateId.
    // Better Auth cannot infer that a custom generator is opaque, so its
    // default would require a freshly registered invitee to verify their
    // email before accepting the very link that proves they received it.
    requireEmailVerificationOnInvitation: false,
    // "Workspaces" are modelled on Better Auth teams. The `enabled` flag is
    // shared with the clients via @flama/auth so both sides must agree.
    teams: {
      ...organizationSharedOptions.teams,
      // The default workspace is created by `OrganizationsService.create`,
      // alongside the role that opens the organization, so organizations can
      // be created here without forcing a default team.
      allowRemovingAllTeams: false,
    },
    sendInvitationEmail: async (data) => {
      const acceptUrl = buildInvitationUrl(frontendUrl, {
        id: data.id,
        email: data.email,
        role: data.role,
        inviterName: data.inviter.user.name,
      });
      await emailQueue.add('invitation', {
        to: data.email,
        organizationName: data.organization.name,
        inviterName: data.inviter.user.name,
        role: data.role,
        organizationId: data.organization.id,
        url: acceptUrl,
      });
    },
  });
}

/**
 * The organization (and workspace) a new session should open in, as the data
 * Better Auth's `session.create.before` hook returns — or nothing, for an
 * account that belongs to no organization yet. A failed query fails the
 * sign-in: guessing "no organization" would send a member to onboarding.
 */
export async function withActiveOrganization<
  T extends { userId: string } & Record<string, unknown>,
>(pool: Pool, session: T) {
  const { rows } = await pool.query<{ organizationId: string; teamId: string | null }>(
    // The organization they last had open, else the one they joined most
    // recently: an explicit sign-out deletes the session row that remembers,
    // and an invitee should land where the invitation put them. The workspace
    // is one they belong to, else the organization's first.
    `SELECT m."organizationId",
            COALESCE(mine."id", fallback."id") AS "teamId"
       FROM "member" m
       LEFT JOIN LATERAL (
         SELECT t."id"
           FROM "team" t
           JOIN "teamMember" tm ON tm."teamId" = t."id" AND tm."userId" = $1
          WHERE t."organizationId" = m."organizationId"
          ORDER BY t."createdAt" ASC
          LIMIT 1
       ) mine ON true
       LEFT JOIN LATERAL (
         SELECT t."id"
           FROM "team" t
          WHERE t."organizationId" = m."organizationId"
          ORDER BY t."createdAt" ASC
          LIMIT 1
       ) fallback ON true
      WHERE m."userId" = $1
      ORDER BY COALESCE(
                 m."organizationId" = (
                   SELECT s."activeOrganizationId"
                     FROM "session" s
                    WHERE s."userId" = $1
                      AND s."activeOrganizationId" IS NOT NULL
                    ORDER BY s."updatedAt" DESC
                    LIMIT 1
                 ),
                 false
               ) DESC,
               m."createdAt" DESC
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
}
