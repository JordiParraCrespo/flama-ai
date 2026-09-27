import { SCOPE_RESOLVER, type ScopeResolverPort } from '@flama/backend-authz';
import { ROLES } from '@flama/shared';
import type { NestInterceptor } from '@nestjs/common';
import { type CallHandler, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  type AbilityHttpRequest,
  type AbilityPort,
  abilityRequestOf,
} from '../../auth/application/ability.port';
import { ABILITY } from '../../auth/auth.di-tokens';
import {
  ACTIVE_ORGANIZATION_HEADER,
  ActiveOrganizationResolver,
} from '../application/active-organization.resolver';
import { ACCESS_SCOPE_KEY } from '../decorators/current-access-scope.decorator';

/** Instance-level roles that short-circuit scoping (Q0). */
const PLATFORM_ROLES: readonly string[] = [ROLES.SUPERADMIN, ROLES.ADMIN];

/**
 * Resolves the caller's {@link AccessScope} and attaches it to the request.
 *
 * Applied per controller rather than globally: resolving membership costs two
 * queries, and only routes touching a scoped resource need it.
 *
 * Order matters — this runs after the auth guards have populated
 * `request.user`, and the scope it produces is what both the CASL conditions
 * and the SQL predicate are built from, so the two always agree.
 */
@Injectable()
export class AccessScopeInterceptor implements NestInterceptor {
  constructor(
    @Inject(SCOPE_RESOLVER)
    private readonly scopeResolver: ScopeResolverPort,
    @Inject(ABILITY)
    private readonly abilities: AbilityPort,
    private readonly activeOrganization: ActiveOrganizationResolver,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const subject = abilityRequestOf(request as AbilityHttpRequest);

    if (subject?.user.id) {
      const { user } = subject;
      const organizationId = await this.activeOrganization.resolve({
        userId: user.id,
        sessionOrganizationId: subject.session?.activeOrganizationId ?? null,
        header: request.headers?.[ACTIVE_ORGANIZATION_HEADER],
      });

      // Built for the organization this request acts in. The memo is keyed by
      // organization, so when the guard resolved the same one this costs
      // nothing, and when it resolved another this cannot inherit its answer.
      const ability = await this.abilities.forRequest(subject, organizationId);

      request[ACCESS_SCOPE_KEY] = await this.scopeResolver.resolve({
        userId: user.id,
        organizationId,
        isPlatformAdmin: PLATFORM_ROLES.includes(user.role ?? ''),
        hasFullAccess: ability.can('manage', 'all'),
      });
      request.activeOrganizationId = organizationId;
    }

    return next.handle();
  }
}
