import { z } from 'zod';
import { ORGANIZATION_ROLES } from '../constants';

/**
 * Contracts for the Better Auth organization + admin plugin operations. The
 * plugins expose their own endpoints under `/api/auth/*`, so these schemas are
 * used for client-side form validation and as the single source of truth for
 * the shared request/response types — not for NestJS controllers.
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

/** Invite a member to the active organization (optionally scoped to a team). */
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: organizationRole.default(ORGANIZATION_ROLES.MEMBER),
  teamId: z.string().uuid().optional(),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: organizationRole,
});

/** Create a workspace (Better Auth team) inside an organization. */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type OrganizationRole = z.infer<typeof organizationRole>;
