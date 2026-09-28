import {
  type AppAbility,
  defineAbilitiesFromPermissions,
  type PermissionDefinition,
  SYSTEM_ROLE_PERMISSIONS,
} from '@flama/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  ABILITY_MEMO,
  type AbilityPort,
  type AbilityPrincipal,
  type AbilityRequest,
  type AbilityScope,
} from '../../auth/application/ability.port';
import type { RoleRepositoryPort } from '../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../database/user-role.repository.port';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../roles.di-tokens';

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
export class AbilityFactory implements AbilityPort {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: UserRoleRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  /**
   * The caller's ability for this request, memoized on the request per
   * resolved organization.
   *
   * Several call sites resolve the ability during one request (the guard, the
   * access-scope interceptor). Without the memo each re-reads the role tables.
   * It is keyed by the organization the ability was built for, so a caller
   * resolving a different organization than the guard did builds its own
   * rather than inheriting the first caller's.
   */
  async forRequest(request: AbilityRequest, organizationId?: string | null): Promise<AppAbility> {
    const scope: AbilityScope = {
      activeOrganizationId: organizationId ?? request.session?.activeOrganizationId ?? null,
      activeTeamId: request.session?.activeTeamId ?? null,
    };
    const key = scope.activeOrganizationId ?? '';

    const memo = request[ABILITY_MEMO];
    const cached = memo?.get(key);
    if (cached) return cached;

    const ability = await this.createForUser(request.user, scope);
    memo?.set(key, ability);
    return ability;
  }

  /**
   * The caller's effective permission definitions — the same union
   * {@link createForUser} builds an ability from, but returned raw so a client
   * can rebuild the ability itself (the web app gates its sidebar on this).
   */
  async permissionsForUser(
    user: AbilityPrincipal,
    scope: AbilityScope = {},
  ): Promise<PermissionDefinition[]> {
    return this.resolvePermissions(user, scope.activeOrganizationId ?? null);
  }

  async createForUser(user: AbilityPrincipal, scope: AbilityScope = {}): Promise<AppAbility> {
    const permissions = await this.resolvePermissions(user, scope.activeOrganizationId ?? null);
    // Pass the principal and active-org scope so resource-scoping conditions
    // (e.g. `${user.id}`, `${activeOrganizationId}`) can be interpolated when
    // the ability is built.
    return defineAbilitiesFromPermissions(permissions, {
      user: { id: user.id, role: user.role ?? null },
      activeOrganizationId: scope.activeOrganizationId ?? null,
      activeTeamId: scope.activeTeamId ?? null,
    });
  }

  private async resolvePermissions(
    user: AbilityPrincipal,
    activeOrganizationId: string | null,
  ): Promise<PermissionDefinition[]> {
    const permissions: PermissionDefinition[] = [];

    // 1. Roles assigned through the `user_role` join (dynamic RBAC), narrowed
    //    to the active organization. The repository unions the caller's global
    //    assignments with the ones scoped to that organization, so a role
    //    granted in one tenant has no effect in another.
    if (user.id) {
      const roles = await this.userRoleRepository.findRolesForUser(user.id, activeOrganizationId);
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
      // Better Auth stores multiple platform roles as a comma-separated value.
      // Resolve each name independently so `user,admin` receives the same
      // control-plane permissions as a single `admin` role.
      const platformRoles = user.role
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean);

      for (const roleName of platformRoles) {
        const found = await this.roleRepository.findOneByName(roleName);
        permissions.push(
          ...(found.isSome()
            ? found.unwrap().permissions.map((permission) => permission.toDefinition())
            : (SYSTEM_ROLE_PERMISSIONS[roleName] ?? [])),
        );
      }
    }

    return permissions;
  }
}
