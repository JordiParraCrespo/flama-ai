import type { Paginated } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import type { UserDomainAccessRepositoryPort } from '../../database/user-domain-access.repository.port';
import type { DomainEntity } from '../../domain/domain.entity';
import { DOMAIN_REPOSITORY, USER_DOMAIN_ACCESS_REPOSITORY } from '../../domain.di-tokens';
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
    @Inject(USER_DOMAIN_ACCESS_REPOSITORY)
    private readonly userDomainAccessRepository: UserDomainAccessRepositoryPort,
  ) {}

  async execute(query: FindDomainsQuery): Promise<Paginated<DomainEntity>> {
    const restrictedTo = await this.userDomainAccessRepository.findDomainIdsForUser(
      query.requesterId,
    );

    return this.domainRepository.findDomains({
      organizationId: query.organizationId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      ownerId: query.ownerId,
      search: query.search,
      // No rows recorded means unrestricted, which the port expresses as
      // `undefined` — an empty array would mean "restricted to nothing".
      allowedDomainIds: restrictedTo.length === 0 ? undefined : restrictedTo,
    });
  }
}
