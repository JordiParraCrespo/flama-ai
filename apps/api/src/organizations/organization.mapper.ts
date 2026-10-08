import { asArray, asRecord } from '../auth/infrastructure/better-auth.util';
import type { Invitation } from './domain/invitation.types';
import type { AssignedRole, Member, MemberUser } from './domain/membership.types';
import type {
  FullOrganization,
  Organization,
  Workspace,
  WorkspaceMember,
} from './domain/organization.types';

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

/**
 * Maps what the Better Auth organization plugin returns, and rows of its tables
 * read straight from Postgres, onto this module's read models — which the
 * response DTOs mirror field for field. Every method that takes `unknown`
 * narrows once via `asRecord`, so the gateways and repositories stay cast-free;
 * this is where all response normalization (coercion, envelope unwrapping, date
 * parsing) lives.
 */
export class OrganizationMapper {
  static toOrganization(input: unknown): Organization {
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

  static toOrganizations(input: unknown): Organization[] {
    return asArray(input).map(OrganizationMapper.toOrganization);
  }

  static toFullOrganization(input: unknown): FullOrganization {
    const o = asRecord(input);
    return {
      ...OrganizationMapper.toOrganization(o),
      members: asArray(o.members).map(OrganizationMapper.toMember),
      invitations: asArray(o.invitations).map(OrganizationMapper.toInvitation),
      teams: asArray(o.teams).map(asRecord),
    };
  }

  static toMember(input: unknown): Member {
    const m = asRecord(input);
    return {
      id: String(m.id),
      organizationId: String(m.organizationId),
      userId: String(m.userId),
      role: String(m.role),
      createdAt: toDate(m.createdAt),
      user: m.user ? OrganizationMapper.toMemberUser(m.user) : null,
    };
  }

  static toMembers(input: unknown): Member[] {
    return asArray(input).map(OrganizationMapper.toMember);
  }

  static toMemberUser(input: unknown): MemberUser {
    const user = asRecord(input);
    return {
      id: String(user.id),
      name: String(user.name ?? ''),
      email: String(user.email ?? ''),
      image: (user.image as string | null) ?? null,
      firstName: String(user.firstName ?? ''),
      lastName: String(user.lastName ?? ''),
      isActive: user.isActive !== false,
      emailVerified: user.emailVerified === true,
    };
  }

  /**
   * The account behind a membership, as the users table has it. Picks the
   * fields a member shows, so a column the users table grows stays there.
   */
  static toAccount(user: MemberUser): MemberUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * Put the account behind each membership on it. Better Auth's member rows
   * carry a thin `user`, when they carry one at all; the members list shows the
   * account as the users table has it.
   */
  static withAccounts(members: Member[], accounts: MemberUser[]): Member[] {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    return members.map((member) => ({ ...member, user: byId.get(member.userId) ?? member.user }));
  }

  /**
   * The `user_role` join's raw rows, grouped by user.
   *
   * A row per assignment is what the query can return; a list per user is what
   * every caller wants, and building it is a shape transformation — so it lives
   * here with the rest of them rather than as a loop inside the repository.
   */
  static toAssignedRolesByUser(input: unknown): Map<string, AssignedRole[]> {
    const byUser = new Map<string, AssignedRole[]>();

    for (const row of asArray(input)) {
      const r = asRecord(row);
      const userId = String(r.userId);
      byUser.set(userId, [
        ...(byUser.get(userId) ?? []),
        { id: String(r.id), name: String(r.name) },
      ]);
    }

    return byUser;
  }

  static toInvitation(input: unknown): Invitation {
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

  static toInvitations(input: unknown): Invitation[] {
    return asArray(input).map(OrganizationMapper.toInvitation);
  }

  /**
   * The pending subset of an invitation list. Better Auth cancels an invitation
   * by flipping its status to `canceled` rather than deleting it, and returns
   * every status from `listInvitations` — so the "pending invitations" endpoints
   * must drop anything already resolved, or a cancelled invite keeps coming back.
   */
  static toPendingInvitations(input: unknown): Invitation[] {
    return OrganizationMapper.toInvitations(input).filter(
      (invitation) => invitation.status === 'pending',
    );
  }

  static toWorkspace(input: unknown): Workspace {
    const t = asRecord(input);
    return {
      id: String(t.id),
      name: String(t.name),
      organizationId: String(t.organizationId),
      createdAt: toDate(t.createdAt),
      updatedAt: toDateOrNull(t.updatedAt),
    };
  }

  static toWorkspaces(input: unknown): Workspace[] {
    return asArray(input).map(OrganizationMapper.toWorkspace);
  }

  static toWorkspaceMember(input: unknown): WorkspaceMember {
    const tm = asRecord(input);
    return {
      id: String(tm.id),
      teamId: String(tm.teamId),
      userId: String(tm.userId),
      createdAt: toDate(tm.createdAt),
    };
  }

  static toWorkspaceMembers(input: unknown): WorkspaceMember[] {
    return asArray(input).map(OrganizationMapper.toWorkspaceMember);
  }
}
