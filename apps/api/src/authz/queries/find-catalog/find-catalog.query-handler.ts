import { ResourceRegistry } from '@flama/backend-authz';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AbilityPort } from '../../../auth/application/ability.port';
import { ABILITY } from '../../../auth/auth.di-tokens';
import { toCatalogResponse } from '../../authz-catalog.mapper';
import type { AuthzCatalogResponseDto } from '../../dtos/authz-catalog.response.dto';
import { FindAuthzCatalogQuery } from './find-catalog.query';

@QueryHandler(FindAuthzCatalogQuery)
export class FindAuthzCatalogQueryHandler
  implements IQueryHandler<FindAuthzCatalogQuery, AuthzCatalogResponseDto>
{
  constructor(
    private readonly registry: ResourceRegistry,
    @Inject(ABILITY)
    private readonly abilities: AbilityPort,
  ) {}

  async execute(query: FindAuthzCatalogQuery): Promise<AuthzCatalogResponseDto> {
    const ability = await this.abilities.createForUser(
      { id: query.userId, role: query.role },
      { activeOrganizationId: query.activeOrganizationId ?? null },
    );

    return toCatalogResponse(this.registry, ability);
  }
}
