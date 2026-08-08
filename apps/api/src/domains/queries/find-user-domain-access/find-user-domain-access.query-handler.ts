import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceAccessService } from '../../../access-control/services/resource-access.service';
import { UserDomainAccessResponseDto } from '../../dtos/user-domain-access.response.dto';
import { DOMAIN_RESOURCE_TYPE } from '../../services/domain-restrictable-resource';
import { FindUserDomainAccessQuery } from './find-user-domain-access.query';

@QueryHandler(FindUserDomainAccessQuery)
export class FindUserDomainAccessQueryHandler
  implements IQueryHandler<FindUserDomainAccessQuery, UserDomainAccessResponseDto>
{
  constructor(private readonly resourceAccess: ResourceAccessService) {}

  async execute(query: FindUserDomainAccessQuery): Promise<UserDomainAccessResponseDto> {
    const { resourceIds, unrestricted } = await this.resourceAccess.restrictedTo(
      query.userId,
      query.organizationId,
      DOMAIN_RESOURCE_TYPE,
    );

    return { userId: query.userId, domainIds: resourceIds, unrestricted };
  }
}
