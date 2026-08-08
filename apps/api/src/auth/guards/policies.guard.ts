import { AppError } from '@flama/backend-core';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../../roles/services/ability.factory';
import { CHECK_POLICIES_KEY, type PolicyRule } from '../decorators/check-policies.decorator';
import { AuthErrors } from '../domain/auth.errors';

/**
 * Authorization guard. Resolves the authenticated user's effective CASL ability
 * from their database-backed roles (via {@link AbilityFactory}) and checks it
 * against the `@CheckPolicies` rules declared on the route. The built ability is
 * attached to `request.ability` so handlers can perform finer-grained,
 * instance-level (resource-scoped) checks.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<PolicyRule[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rules || rules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No principal at all is an *authentication* failure, not a permission
    // one — 401 tells a client to re-authenticate, where a 403 would have it
    // give up on a request that a fresh session would satisfy.
    if (!user) {
      throw new AppError(AuthErrors.UNAUTHENTICATED, {
        detail: 'This endpoint requires an authenticated caller.',
      });
    }

    // The active organization/workspace lives on the Better Auth session; pass
    // it so org-scoped permission conditions (`${activeOrganizationId}`) resolve.
    const session = request.session;
    const ability = await this.abilityFactory.createForUser(user, {
      activeOrganizationId: session?.activeOrganizationId ?? null,
      activeTeamId: session?.activeTeamId ?? null,
    });
    request.ability = ability;

    // Returning `false` would hand back Nest's own codeless 403; throw the
    // catalog error instead so the response carries `AUTH_002` like every other
    // failure. The rule that failed is deliberately not named — see the catalog.
    if (!rules.every((rule) => ability.can(rule.action, rule.subject))) {
      throw new AppError(AuthErrors.FORBIDDEN);
    }

    return true;
  }
}
