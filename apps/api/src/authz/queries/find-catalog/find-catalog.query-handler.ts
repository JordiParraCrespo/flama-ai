import { ResourceRegistry } from '@flama/backend-authz';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AbilityFactory } from '../../../roles/application/ability.factory';
import { toCatalogResponse } from '../../authz-catalog.mapper';
import type { AuthzCatalogResponseDto } from '../../dtos/authz-catalog.response.dto';
import { FindAuthzCatalogQuery } from './find-catalog.query';

@QueryHandler(FindAuthzCatalogQuery)
export class FindAuthzCatalogQueryHandler
  implements IQueryHandler<FindAuthzCatalogQuery, AuthzCatalogResponseDto>
{
  constructor(
    private readonly registry: ResourceRegistry,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async execute(query: FindAuthzCatalogQuery): Promise<AuthzCatalogResponseDto> {
    const ability = await this.abilityFactory.createForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );

    return toCatalogResponse(this.registry, ability);
  }
}
