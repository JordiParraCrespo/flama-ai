import { ApiProblemResponse } from '@flama/backend-core';
import type { AppAbility } from '@flama/shared';
import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { type RequestWithSession, requireActiveOrganizationId } from '../../active-organization';
import type { DomainEntity } from '../../domain/domain.entity';
import { DomainMapper } from '../../domain.mapper';
import { assertCanReachDomain } from '../../domain-access.guard-helper';
import { DomainResponseDto } from '../../dtos/domain.response.dto';
import { FindDomainByIdQuery } from './find-domain-by-id.query';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('domains')
export class FindDomainByIdHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: DomainMapper,
  ) {}

  @Get(':id')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Domain' })
  @RequireScopes('domains:read')
  @ApiOperation({ summary: 'Get a domain' })
  @ApiResponse({ status: 200, type: DomainResponseDto })
  @ApiProblemResponse({
    status: 404,
    description: 'Domain not found',
    code: 'DOMAIN_001',
  })
  @ApiProblemResponse({
    status: 403,
    description: 'Caller has no access to this domain',
    code: 'DOMAIN_006',
  })
  async findById(
    @Req() request: RequestWithSession & { ability?: AppAbility },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DomainResponseDto> {
    const organizationId = requireActiveOrganizationId(request);

    const domain = await this.queryBus.execute<FindDomainByIdQuery, DomainEntity>(
      new FindDomainByIdQuery({ domainId: id, organizationId }),
    );

    // The route guard only checked action+subject. Per-domain access is an
    // instance-level rule, so it is enforced here against the loaded record.
    assertCanReachDomain(request.ability, 'read', domain);

    return this.mapper.toResponse(domain);
  }
}
