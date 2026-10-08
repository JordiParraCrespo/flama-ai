import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RoleRepositoryPort } from '../../roles/database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../roles/database/user-role.repository.port';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../../roles/roles.di-tokens';
import type { OrganizationAccessRepositoryPort } from '../database/organization-access.repository.port';
import { applicationRoleFor, MEMBERSHIP_ROLES } from '../domain/application-role.policy';
import { ORGANIZATION_ACCESS } from '../organizations.di-tokens';

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
  ) {}

  /**
   * Make a roster change and the application role that goes with it, or
   * neither. `write` is Better Auth's roster write; if the role that opens the
   * organization cannot be granted after it (the system role is missing, the
   * store failed), `undo` reverts the roster and the original error is raised.
   * Every door into an organization goes through here: creating it, adding a
   * member, accepting an invitation. A role change is {@link reassign}.
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
   * Change a member's organization role and the application role that stands
   * for it, or neither — in the opposite order to {@link admit}. The new
   * application role is granted first and Better Auth's write follows; if that
   * write is refused, the application roles the member held before are put
   * back. Undoing Better Auth's write instead would need the caller's
   * permission to change roles, which a caller demoting themselves has just
   * given up; putting back rows in the app's own store needs none.
   */
  async reassign<T>(entry: RosterEntry, write: () => Promise<T>): Promise<T> {
    const before = await this.scopedRoleIds(entry.userId, entry.organizationId);
    await this.grant(entry);
    try {
      return await write();
    } catch (error) {
      try {
        await this.userRoles.setRolesForUser(entry.userId, before, entry.organizationId);
      } catch (restoreError) {
        this.logger.error(
          {
            message: 'Could not restore the application roles of a refused role change',
            userId: entry.userId,
            organizationId: entry.organizationId,
          },
          restoreError instanceof Error ? restoreError.stack : String(restoreError),
        );
      }
      throw error;
    }
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

    const membership = [...membershipRoleIds.values()];
    const custom = (await this.scopedRoleIds(userId, organizationId)).filter(
      (id) => !membership.includes(id),
    );
    await this.userRoles.setRolesForUser(userId, [...custom, roleId], organizationId);
  }

  /**
   * The roles assigned to `userId` in `organizationId` itself. The port answers
   * a scoped read with the global assignments included; those are not this
   * scope's to rewrite.
   */
  private async scopedRoleIds(userId: string, organizationId: string): Promise<string[]> {
    const [inScope, global] = await Promise.all([
      this.userRoles.findRoleIdsForUser(userId, organizationId),
      this.userRoles.findRoleIdsForUser(userId, null),
    ]);
    return inScope.filter((id) => !global.includes(id));
  }

  /**
   * After Better Auth ends a membership, take everything the organization gave
   * — roles, grants and a session still acting in it.
   */
  revoke({ userId, organizationId }: RosterEntry): Promise<void> {
    return this.access.revokeFor(userId, organizationId);
  }
}
