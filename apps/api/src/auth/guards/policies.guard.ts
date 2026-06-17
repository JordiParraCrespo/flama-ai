import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../../roles/services/ability.factory';
import { CHECK_POLICIES_KEY, type PolicyRule } from '../decorators/check-policies.decorator';

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

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const ability = await this.abilityFactory.createForUser(user);
    request.ability = ability;

    return rules.every((rule) => ability.can(rule.action, rule.subject));
  }
}
