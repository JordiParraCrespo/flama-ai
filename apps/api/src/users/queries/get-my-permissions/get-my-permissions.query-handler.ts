import type { PermissionDefinition } from '@flama/shared';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AbilityFactory } from '../../../roles/application/ability.factory';
import { GetMyPermissionsQuery } from './get-my-permissions.query';

@QueryHandler(GetMyPermissionsQuery)
export class GetMyPermissionsQueryHandler
  implements IQueryHandler<GetMyPermissionsQuery, PermissionDefinition[]>
{
  constructor(private readonly abilityFactory: AbilityFactory) {}

  async execute(query: GetMyPermissionsQuery): Promise<PermissionDefinition[]> {
    return this.abilityFactory.permissionsForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );
  }
}
