import { Inject, Injectable } from '@nestjs/common';
import type { RoleRepositoryPort } from '../../roles/database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../roles/database/user-role.repository.port';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../../roles/roles.di-tokens';
import type { OrganizationAccessRepositoryPort } from '../database/organization-access.repository.port';
import { applicationRoleFor, MEMBERSHIP_ROLES } from '../domain/application-role.policy';
import { ORGANIZATION_ACCESS } from '../organizations.di-tokens';

/**
 * Keeps what the app lets a person do in an organization aligned with Better
 * Auth's roster of it. Better Auth owns membership roles; CASL owns application
 * permissions. Every door into an organization — creating it, adding a member,
 * changing their role, accepting an invitation — grants the org-scoped role
 * here, and every way out revokes what the organization gave.
 */
@Injectable()
export class MembershipAccessPolicy {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
    @Inject(ORGANIZATION_ACCESS)
    private readonly access: OrganizationAccessRepositoryPort,
  ) {}

  /**
   * Write the org-scoped application role the organization role stands for.
   *
   * Only the role that stands for the membership (`owner` or `user`) is
   * swapped, scoped to this organization so an org admin never becomes a
   * platform-wide one. Custom roles an admin assigned in this organization are
   * the member's too, and a roster change must not take them away.
   */
  async grant(userId: string, organizationId: string, organizationRole: string): Promise<void> {
    const membershipRoleIds = new Map<string, string>();
    for (const name of MEMBERSHIP_ROLES) {
      const role = await this.roles.findOneByName(name, null);
      if (role.isNone()) throw new Error(`Required system role "${name}" is missing`);
      membershipRoleIds.set(name, role.unwrap().id);
    }
    // The port answers a scoped read with the global assignments included;
    // those are not this scope's to rewrite.
    const [inScope, global] = await Promise.all([
      this.userRoles.findRoleIdsForUser(userId, organizationId),
      this.userRoles.findRoleIdsForUser(userId, null),
    ]);
    const membership = [...membershipRoleIds.values()];
    const custom = inScope.filter((id) => !global.includes(id) && !membership.includes(id));
    const roleId = membershipRoleIds.get(applicationRoleFor(organizationRole)) as string;
    await this.userRoles.setRolesForUser(userId, [...custom, roleId], organizationId);
  }

  /**
   * Revoke every organization-local access path after Better Auth removes the
   * membership. The role assignment is the authorization boundary; clearing
   * grants and stale session selection prevents the removed person from still
   * appearing or acting inside the organization through secondary tables.
   */
  revoke(userId: string, organizationId: string): Promise<void> {
    return this.access.revokeFor(userId, organizationId);
  }
}
