import { defineAbilitiesFor } from '@flama/shared';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY, type PolicyRule } from '../decorators/check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    const ability = defineAbilitiesFor(user.role);

    return rules.every((rule) => ability.can(rule.action, rule.subject));
  }
}
