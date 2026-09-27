import { grantableScopes, type Scope } from '@flama/shared';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbilityPort } from '../../../auth/application/ability.port';
import { ABILITY } from '../../../auth/auth.di-tokens';
import { FindGrantablePermissionsQuery } from './find-grantable-permissions.query';

@QueryHandler(FindGrantablePermissionsQuery)
export class FindGrantablePermissionsQueryHandler
  implements IQueryHandler<FindGrantablePermissionsQuery, Scope[]>
{
  constructor(@Inject(ABILITY) private readonly abilities: AbilityPort) {}

  async execute(query: FindGrantablePermissionsQuery): Promise<Scope[]> {
    const ability = await this.abilities.createForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );
    return grantableScopes(ability);
  }
}
