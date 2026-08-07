import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import type { DomainEntity } from '../../domain/domain.entity';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { FindDomainByIdQuery } from './find-domain-by-id.query';

@QueryHandler(FindDomainByIdQuery)
export class FindDomainByIdQueryHandler
  implements IQueryHandler<FindDomainByIdQuery, DomainEntity>
{
  constructor(
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
  ) {}

  async execute(query: FindDomainByIdQuery): Promise<DomainEntity> {
    const found = await this.domainRepository.findOneById(query.domainId);

    // A domain in another organization is reported as missing, not forbidden,
    // so ids cannot be probed across tenants.
    if (found.isNone() || found.unwrap().organizationId !== query.organizationId) {
      throw new AppError(DomainErrors.NOT_FOUND, {
        detail: `No domain with id ${query.domainId}`,
        extensions: { domainId: query.domainId },
      });
    }

    return found.unwrap();
  }
}
