import type { PermissionDefinition } from '@flama/shared';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbilityPort } from '../../../auth/application/ability.port';
import { ABILITY } from '../../../auth/auth.di-tokens';
import { GetMyPermissionsQuery } from './get-my-permissions.query';

@QueryHandler(GetMyPermissionsQuery)
export class GetMyPermissionsQueryHandler
  implements IQueryHandler<GetMyPermissionsQuery, PermissionDefinition[]>
{
  constructor(@Inject(ABILITY) private readonly abilities: AbilityPort) {}

  async execute(query: GetMyPermissionsQuery): Promise<PermissionDefinition[]> {
    return this.abilities.permissionsForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );
  }
}
