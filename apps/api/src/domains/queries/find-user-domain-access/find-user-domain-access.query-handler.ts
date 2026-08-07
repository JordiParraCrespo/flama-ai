import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { UserDomainAccessRepositoryPort } from '../../database/user-domain-access.repository.port';
import { USER_DOMAIN_ACCESS_REPOSITORY } from '../../domain.di-tokens';
import { UserDomainAccessResponseDto } from '../../dtos/user-domain-access.response.dto';
import { FindUserDomainAccessQuery } from './find-user-domain-access.query';

@QueryHandler(FindUserDomainAccessQuery)
export class FindUserDomainAccessQueryHandler
  implements IQueryHandler<FindUserDomainAccessQuery, UserDomainAccessResponseDto>
{
  constructor(
    @Inject(USER_DOMAIN_ACCESS_REPOSITORY)
    private readonly userDomainAccessRepository: UserDomainAccessRepositoryPort,
  ) {}

  async execute(query: FindUserDomainAccessQuery): Promise<UserDomainAccessResponseDto> {
    const domainIds = await this.userDomainAccessRepository.findDomainIdsForUser(
      query.userId,
      query.organizationId,
    );

    return {
      userId: query.userId,
      domainIds,
      unrestricted: domainIds.length === 0,
    };
  }
}
