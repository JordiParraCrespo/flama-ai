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

/** Minimal shape of the authenticated principal the guard hands to the factory. */
export interface AuthenticatedUser {
  id?: string;
  /** Legacy single-role column, used as a fallback before migration. */
  role?: string;
  [key: string]: unknown;
}

/** Request-scoped context used to interpolate resource-scoping conditions. */
export interface AbilityScope {
  /** The caller's active organization (from `session.activeOrganizationId`). */
  activeOrganizationId?: string | null;
  /** The caller's active workspace/team (from `session.activeTeamId`). */
  activeTeamId?: string | null;
}

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
  ) {}

  async createForUser(user: AuthenticatedUser, scope: AbilityScope = {}): Promise<AppAbility> {
    const permissions = await this.resolvePermissions(user);
    // Pass the principal and active-org scope so resource-scoping conditions
    // (e.g. `${user.id}`, `${activeOrganizationId}`) can be interpolated when
    // the ability is built.
    return defineAbilitiesFromPermissions(permissions, {
      user,
      activeOrganizationId: scope.activeOrganizationId ?? null,
      activeTeamId: scope.activeTeamId ?? null,
    });
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
