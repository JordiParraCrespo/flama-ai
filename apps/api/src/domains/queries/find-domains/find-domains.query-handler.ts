import type { Paginated } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceAccessService } from '../../../access-control/services/resource-access.service';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import type { DomainEntity } from '../../domain/domain.entity';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { DOMAIN_RESOURCE_TYPE } from '../../services/domain-restrictable-resource';
import { FindDomainsQuery } from './find-domains.query';

/**
 * Lists domains in the caller's organization, narrowed to the domains they may
 * reach.
 *
 * The restriction is applied as a `WHERE id IN (...)` rather than by filtering
 * the page after the fact: post-filtering would silently return short pages and
 * a `total` that counts rows the caller cannot see.
 */
@QueryHandler(FindDomainsQuery)
export class FindDomainsQueryHandler
  implements IQueryHandler<FindDomainsQuery, Paginated<DomainEntity>>
{
  constructor(
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  async execute(query: FindDomainsQuery): Promise<Paginated<DomainEntity>> {
    // `undefined` when unrestricted in this organization; the service owns that
    // distinction so an empty list is never mistaken for "allowed nothing".
    const allowedDomainIds = await this.resourceAccess.allowedIds(
      query.requesterId,
      query.organizationId,
      DOMAIN_RESOURCE_TYPE,
    );

    return this.domainRepository.findDomains({
      organizationId: query.organizationId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      ownerId: query.ownerId,
      search: query.search,
      allowedDomainIds,
    });
  }
}
