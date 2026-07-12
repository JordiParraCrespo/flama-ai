import { z } from 'zod';
import { ORGANIZATION_ROLES } from '../constants';

/**
 * Request contracts for the organization / members / invitations / workspaces
 * REST modules (`apps/api/src/organizations`), which delegate to the Better Auth
 * organization plugin. Also usable for client-side form validation. Path
 * parameters (org id, member id, invitation id, team id) are validated as UUIDs
 * by the controllers, so only request bodies are modelled here.
 */

const organizationRole = z.enum([
  ORGANIZATION_ROLES.OWNER,
  ORGANIZATION_ROLES.ADMIN,
  ORGANIZATION_ROLES.MEMBER,
]);

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens')
    .optional(),
  logo: z.string().url().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logo: z.string().url().optional(),
});

export const checkSlugSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
});

/** Invite a member to an organization (optionally scoped to a team/workspace). */
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: organizationRole.default(ORGANIZATION_ROLES.MEMBER),
  teamId: z.string().uuid().optional(),
});

/** Directly add an existing user as a member (server-side add, no invitation). */
export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: organizationRole.default(ORGANIZATION_ROLES.MEMBER),
  teamId: z.string().uuid().optional(),
});

/** Change a member's organization role (member id is a path parameter). */
export const updateMemberRoleSchema = z.object({
  role: organizationRole,
});

/** Create a workspace (Better Auth team) inside an organization. */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

/** Add a user to a workspace (user id in the body, team id in the path). */
export const addWorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
export type CheckSlugDto = z.infer<typeof checkSlugSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type AddMemberDto = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type AddWorkspaceMemberDto = z.infer<typeof addWorkspaceMemberSchema>;
export type OrganizationRole = z.infer<typeof organizationRole>;
