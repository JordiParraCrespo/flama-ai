import {
  type AppAbility,
  defineAbilitiesFromPermissions,
  type PermissionDefinition,
  SYSTEM_ROLE_PERMISSIONS,
} from '@flama/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { RoleRepositoryPort } from '../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../database/user-role.repository.port';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../roles.di-tokens';
import type { AbilityScope, AuthenticatedUser } from './ability.types';
import { AbilityContributorRegistry } from './ability-contributor';

export type { AbilityScope, AuthenticatedUser } from './ability.types';

/**
 * Builds a CASL ability for an authenticated user from the union of every role
 * assigned to them. This replaces the old hardcoded `defineAbilitiesFor(role)`
 * switch: permissions now live in the database and are fully admin-managed.
 *
 * Resolution order:
 *   1. Roles assigned through the `user_role` join (dynamic RBAC).
 *   2. Fallback to the legacy `user.role` column — first the DB role of that
 *      name, then the seeded system-role permissions — so users that predate
 *      the join keep working.
 */
@Injectable()
export class AbilityFactory {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: UserRoleRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
    private readonly contributorRegistry: AbilityContributorRegistry,
  ) {}

  async createForUser(user: AuthenticatedUser, scope: AbilityScope = {}): Promise<AppAbility> {
    const permissions = await this.resolvePermissions(user);
    permissions.push(...(await this.resolveContributedRestrictions(user, scope)));
    // Pass the principal and active-org scope so resource-scoping conditions
    // (e.g. `${user.id}`, `${activeOrganizationId}`) can be interpolated when
    // the ability is built.
    return defineAbilitiesFromPermissions(permissions, {
      user,
      activeOrganizationId: scope.activeOrganizationId ?? null,
      activeTeamId: scope.activeTeamId ?? null,
    });
  }

  /**
   * Collect narrowing rules from feature modules (see {@link AbilityContributor}).
   * These are appended after the role-derived rules, so a `cannot` here always
   * wins over a `can` a role granted — CASL gives the last matching rule
   * precedence.
   *
   * Only `inverted` rules are honoured. A contributor is a feature module, not
   * an administrator: letting one return a permissive rule would be a path to
   * access no role ever granted, so permissive rules are dropped rather than
   * trusted.
   */
  private async resolveContributedRestrictions(
    user: AuthenticatedUser,
    scope: AbilityScope,
  ): Promise<PermissionDefinition[]> {
    const contributors = this.contributorRegistry.all();
    if (contributors.length === 0) return [];

    const contributed = await Promise.all(
      contributors.map((contributor) => contributor.contribute(user, scope)),
    );

    return contributed.flat().filter((rule) => rule.inverted === true);
  }

  private async resolvePermissions(user: AuthenticatedUser): Promise<PermissionDefinition[]> {
    const permissions: PermissionDefinition[] = [];

    // 1. Roles assigned through the `user_role` join (dynamic RBAC).
    if (user.id) {
      const roles = await this.userRoleRepository.findRolesForUser(user.id);
      for (const role of roles) {
        permissions.push(...role.permissions.map((permission) => permission.toDefinition()));
      }
    }

    // 2. Also honour the Better Auth `user.role` column. The admin plugin's
    //    `set-role` writes this column, so unioning it here (not just as a
    //    fallback) keeps admin-plugin promotions in sync with CASL: a user
    //    promoted to `admin`/`superadmin` gains that role's permissions even
    //    though their `user_role` join still holds the default `user` row.
    if (user.role) {
      const found = await this.roleRepository.findOneByName(user.role);
      permissions.push(
        ...(found.isSome()
          ? found.unwrap().permissions.map((permission) => permission.toDefinition())
          : (SYSTEM_ROLE_PERMISSIONS[user.role] ?? [])),
      );
    }

    return permissions;
  }
}
