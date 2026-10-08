import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RoleRepositoryPort } from '../../roles/database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../roles/database/user-role.repository.port';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../../roles/roles.di-tokens';
import type { MemberRepositoryPort } from '../database/member.repository.port';
import type { OrganizationAccessRepositoryPort } from '../database/organization-access.repository.port';
import { applicationRoleFor, MEMBERSHIP_ROLES } from '../domain/application-role.policy';
import type { Member } from '../domain/membership.types';
import { OrganizationMapper } from '../organization.mapper';
import { MEMBER_REPOSITORY, ORGANIZATION_ACCESS } from '../organizations.di-tokens';

/** A membership as Better Auth wrote it: who, where, in which organization role. */
export interface RosterEntry {
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Keeps what the app lets a person do in an organization aligned with Better
 * Auth's roster of it. Better Auth owns membership roles; CASL owns application
 * permissions; no transaction spans the two stores. So neither half is left
 * standing alone: a roster write whose application role cannot be written is
 * undone, and ending a membership takes everything the organization gave.
 */
@Injectable()
export class MembershipAccessPolicy {
  private readonly logger = new Logger(MembershipAccessPolicy.name);

  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
    @Inject(ORGANIZATION_ACCESS)
    private readonly access: OrganizationAccessRepositoryPort,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
  ) {}

  /**
   * Make a roster change and the application role that goes with it, or
   * neither. `write` is Better Auth's roster write; if the role that opens the
   * organization cannot be granted after it (the system role is missing, the
   * store failed), `undo` reverts the roster and the original error is raised.
   * Every door into an organization goes through here: creating it, adding a
   * member, changing their role, accepting an invitation.
   */
  async admit<Entry extends RosterEntry>(
    write: () => Promise<Entry>,
    undo: (entry: Entry) => Promise<unknown>,
  ): Promise<Entry> {
    const entry = await write();
    try {
      await this.grant(entry);
    } catch (error) {
      try {
        await undo(entry);
      } catch (undoError) {
        // The caller must see why they were refused, not an error about the
        // cleanup; the half-made membership is what this log is for.
        this.logger.error(
          {
            message: 'Could not undo a roster change whose application role failed',
            userId: entry.userId,
            organizationId: entry.organizationId,
          },
          undoError instanceof Error ? undoError.stack : String(undoError),
        );
      }
      throw error;
    }
    return entry;
  }

  /**
   * Write the org-scoped application role the organization role stands for.
   *
   * Only the role that stands for the membership (`owner` or `user`) is
   * swapped, scoped to this organization so an org admin never becomes a
   * platform-wide one. Custom roles an admin assigned in this organization are
   * the member's too, and a roster change must not take them away.
   */
  async grant({ userId, organizationId, role }: RosterEntry): Promise<void> {
    const membershipRoleIds = new Map<string, string>();
    for (const name of MEMBERSHIP_ROLES) {
      const found = await this.roles.findOneByName(name, null);
      if (found.isNone()) throw new Error(`Required system role "${name}" is missing`);
      membershipRoleIds.set(name, found.unwrap().id);
    }
    const roleId = membershipRoleIds.get(applicationRoleFor(role));
    if (!roleId) throw new Error(`No system role stands for the organization role "${role}"`);

    // The port answers a scoped read with the global assignments included;
    // those are not this scope's to rewrite.
    const [inScope, global] = await Promise.all([
      this.userRoles.findRoleIdsForUser(userId, organizationId),
      this.userRoles.findRoleIdsForUser(userId, null),
    ]);
    const membership = [...membershipRoleIds.values()];
    const custom = inScope.filter((id) => !global.includes(id) && !membership.includes(id));
    await this.userRoles.setRolesForUser(userId, [...custom, roleId], organizationId);
  }

  /**
   * After Better Auth ends a membership: take everything the organization gave
   * — roles, grants and a session still acting in it — and answer with the
   * membership that ended, with the account behind it.
   */
  async release(member: Member): Promise<Member> {
    await this.access.revokeFor(member.userId, member.organizationId);
    const [withAccount] = OrganizationMapper.withAccounts(
      [member],
      await this.members.findAccounts([member.userId]),
    );
    return withAccount;
  }
}
