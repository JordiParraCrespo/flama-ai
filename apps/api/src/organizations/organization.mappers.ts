import { asArray, asRecord } from '../auth/better-auth.util';
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
 * reuse them. Every mapper accepts `unknown` and narrows once via `asRecord`,
 * so the services stay cast-free; this is where all response normalization
 * (coercion, envelope unwrapping, date parsing) lives.
 */

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
  return asRecord(value);
}

export function mapOrganization(input: unknown): OrganizationResponseDto {
  const o = asRecord(input);
  return {
    id: String(o.id),
    name: String(o.name),
    slug: String(o.slug),
    logo: (o.logo as string | null) ?? null,
    metadata: parseMetadata(o.metadata),
    createdAt: toDate(o.createdAt),
  };
}

export function mapMember(input: unknown): MemberResponseDto {
  const m = asRecord(input);
  return {
    id: String(m.id),
    organizationId: String(m.organizationId),
    userId: String(m.userId),
    role: String(m.role),
    createdAt: toDate(m.createdAt),
  };
}

export function mapInvitation(input: unknown): InvitationResponseDto {
  const i = asRecord(input);
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

export function mapWorkspace(input: unknown): WorkspaceResponseDto {
  const t = asRecord(input);
  return {
    id: String(t.id),
    name: String(t.name),
    organizationId: String(t.organizationId),
    createdAt: toDate(t.createdAt),
    updatedAt: toDateOrNull(t.updatedAt),
  };
}

export function mapWorkspaceMember(input: unknown): WorkspaceMemberResponseDto {
  const tm = asRecord(input);
  return {
    id: String(tm.id),
    teamId: String(tm.teamId),
    userId: String(tm.userId),
    createdAt: toDate(tm.createdAt),
  };
}

export function mapFullOrganization(input: unknown): FullOrganizationResponseDto {
  const o = asRecord(input);
  return {
    ...mapOrganization(o),
    members: asArray(o.members).map(mapMember),
    invitations: asArray(o.invitations).map(mapInvitation),
    teams: asArray(o.teams).map(asRecord),
  };
}

export const mapOrganizations = (input: unknown): OrganizationResponseDto[] =>
  asArray(input).map(mapOrganization);
export const mapMembers = (input: unknown): MemberResponseDto[] => asArray(input).map(mapMember);
export const mapInvitations = (input: unknown): InvitationResponseDto[] =>
  asArray(input).map(mapInvitation);
export const mapWorkspaces = (input: unknown): WorkspaceResponseDto[] =>
  asArray(input).map(mapWorkspace);
export const mapWorkspaceMembers = (input: unknown): WorkspaceMemberResponseDto[] =>
  asArray(input).map(mapWorkspaceMember);
