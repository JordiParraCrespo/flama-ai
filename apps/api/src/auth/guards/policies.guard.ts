import { NO_POLICY_KEY } from '@flama/backend-authz';
import { AppError } from '@flama/backend-core';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzErrors } from '../../authz/domain/authz.errors';
import { AbilityFactory } from '../../roles/services/ability.factory';
import { CHECK_POLICIES_KEY, type PolicyRule } from '../decorators/check-policies.decorator';

/**
 * Authorization guard. Resolves the caller's effective CASL ability from their
 * database-backed roles and checks it against the `@CheckPolicies` rules on the
 * route. The ability is attached to `request.ability` so handlers can perform
 * instance-level checks.
 *
 * **Fails closed.** A route that declares neither `@CheckPolicies` nor an
 * explicit `@NoPolicy('reason')` is rejected. The previous behaviour — allow
 * any authenticated caller — meant a forgotten decorator silently opened an
 * endpoint, which is the opposite of how `ScopesGuard` treats the same
 * omission. `route-policy-coverage.spec.ts` turns that rejection into a build
 * failure so it is caught when the route is written.
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

    const exemption = this.reflector.getAllAndOverride<string>(NO_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rules || rules.length === 0) {
      if (exemption) return true;
      // A programming error, not a client one: the route reached production
      // without saying what it requires.
      throw new AppError(AuthzErrors.ROUTE_HAS_NO_POLICY);
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const ability = await this.abilityFactory.forRequest(request);
    return rules.every((rule) => ability.can(rule.action, rule.subject));
  }
}
