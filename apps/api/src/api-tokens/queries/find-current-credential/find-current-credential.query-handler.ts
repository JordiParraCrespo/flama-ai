import { expandScopes, grantableScopes, type Scope, sortScopes } from '@flama/shared';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbilityPort } from '../../../auth/application/ability.port';
import { ABILITY } from '../../../auth/auth.di-tokens';
import { FindCurrentCredentialQuery } from './find-current-credential.query';

export interface CurrentCredentialScopes {
  grantedScopes: Scope[] | null;
  effectiveScopes: Scope[];
}

/**
 * Computes what the calling credential can actually do.
 *
 * A scope is effective only if the credential carries it *and* the owner's
 * roles still permit it, so revoking a role immediately narrows the answer.
 */
@QueryHandler(FindCurrentCredentialQuery)
export class FindCurrentCredentialQueryHandler
  implements IQueryHandler<FindCurrentCredentialQuery, CurrentCredentialScopes>
{
  constructor(@Inject(ABILITY) private readonly abilities: AbilityPort) {}

  async execute(query: FindCurrentCredentialQuery): Promise<CurrentCredentialScopes> {
    const ability = await this.abilities.createForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );

    const permitted = grantableScopes(ability);

    // A browser session carries no scope restriction: everything its owner's
    // roles allow is in effect.
    if (!query.grantedScopes) {
      return { grantedScopes: null, effectiveScopes: permitted };
    }

    const granted = expandScopes(query.grantedScopes);
    return {
      grantedScopes: sortScopes(query.grantedScopes),
      effectiveScopes: permitted.filter((scope) => granted.has(scope)),
    };
  }
}
