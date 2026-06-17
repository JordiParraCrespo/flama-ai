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

  async createForUser(user: AuthenticatedUser): Promise<AppAbility> {
    const permissions = await this.resolvePermissions(user);
    // Pass the principal so resource-scoping conditions (e.g. `${user.id}`) can
    // be interpolated when the ability is built.
    return defineAbilitiesFromPermissions(permissions, { user });
  }

  private async resolvePermissions(user: AuthenticatedUser): Promise<PermissionDefinition[]> {
    if (user.id) {
      const roles = await this.userRoleRepository.findRolesForUser(user.id);
      if (roles.length > 0) {
        return roles.flatMap((role) =>
          role.permissions.map((permission) => permission.toDefinition()),
        );
      }
    }

    if (user.role) {
      const found = await this.roleRepository.findOneByName(user.role);
      if (found.isSome()) {
        return found.unwrap().permissions.map((permission) => permission.toDefinition());
      }
      return SYSTEM_ROLE_PERMISSIONS[user.role] ?? [];
    }

    return [];
  }
}
