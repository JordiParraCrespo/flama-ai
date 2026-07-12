import type {
  FullOrganizationResponseDto,
  InvitationResponseDto,
  MemberResponseDto,
  OrganizationResponseDto,
} from './dtos/organization.response.dto';
import type {
  WorkspaceMemberResponseDto,
  WorkspaceResponseDto,
} from './dtos/workspace.response.dto';

/**
 * Pure mappers from Better Auth organization-plugin API results to the module's
 * response DTOs. Kept framework-free so both the services and any tests can
 * reuse them. Inputs are typed loosely because Better Auth's inferred return
 * types are broad; only the fields the DTO needs are read.
 */

type Raw = Record<string, unknown>;

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : toDate(value);
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return value as Record<string, unknown>;
}

export function mapOrganization(o: Raw): OrganizationResponseDto {
  return {
    id: String(o.id),
    name: String(o.name),
    slug: String(o.slug),
    logo: (o.logo as string | null) ?? null,
    metadata: parseMetadata(o.metadata),
    createdAt: toDate(o.createdAt),
  };
}

export function mapMember(m: Raw): MemberResponseDto {
  return {
    id: String(m.id),
    organizationId: String(m.organizationId),
    userId: String(m.userId),
    role: String(m.role),
    createdAt: toDate(m.createdAt),
  };
}

export function mapInvitation(i: Raw): InvitationResponseDto {
  return {
    id: String(i.id),
    organizationId: String(i.organizationId),
    email: String(i.email),
    role: (i.role as string | null) ?? null,
    status: String(i.status),
    teamId: (i.teamId as string | null) ?? null,
    inviterId: String(i.inviterId),
    expiresAt: toDate(i.expiresAt),
    createdAt: toDate(i.createdAt),
  };
}

export function mapWorkspace(t: Raw): WorkspaceResponseDto {
  return {
    id: String(t.id),
    name: String(t.name),
    organizationId: String(t.organizationId),
    createdAt: toDate(t.createdAt),
    updatedAt: toDateOrNull(t.updatedAt),
  };
}

export function mapWorkspaceMember(tm: Raw): WorkspaceMemberResponseDto {
  return {
    id: String(tm.id),
    teamId: String(tm.teamId),
    userId: String(tm.userId),
    createdAt: toDate(tm.createdAt),
  };
}

export function mapFullOrganization(o: Raw): FullOrganizationResponseDto {
  return {
    ...mapOrganization(o),
    members: Array.isArray(o.members) ? (o.members as Raw[]).map(mapMember) : [],
    invitations: Array.isArray(o.invitations) ? (o.invitations as Raw[]).map(mapInvitation) : [],
    teams: Array.isArray(o.teams) ? (o.teams as Record<string, unknown>[]) : [],
  };
}
