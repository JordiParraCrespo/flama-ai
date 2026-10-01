import { AppError } from '@flama/backend-core';
import type { Paginated } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ACCESS_GRANT_REPOSITORY } from '../../authz.di-tokens';
import type { AccessGrantRepositoryPort } from '../../database/access-grant.repository.port';
import type { AccessGrantEntity } from '../../domain/access-grant.entity';
import { AccessGrantErrors } from '../../domain/access-grant.errors';
import { FindAccessGrantsQuery } from './find-access-grants.query';

@QueryHandler(FindAccessGrantsQuery)
export class FindAccessGrantsQueryHandler
  implements IQueryHandler<FindAccessGrantsQuery, Paginated<AccessGrantEntity>>
{
  constructor(
    @Inject(ACCESS_GRANT_REPOSITORY)
    private readonly grants: AccessGrantRepositoryPort,
  ) {}

  async execute(query: FindAccessGrantsQuery): Promise<Paginated<AccessGrantEntity>> {
    if (!query.scope.organizationId) {
      throw new AppError(AccessGrantErrors.NO_ACTIVE_ORGANIZATION);
    }
    return this.grants.findPageInOrganization(query.scope.organizationId, {
      page: query.page,
      limit: query.limit,
    });
  }
}
