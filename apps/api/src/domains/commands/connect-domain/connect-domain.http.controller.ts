import { ApiProblemResponse } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { type RequestWithSession, requireActiveOrganizationId } from '../../active-organization';
import type { DomainEntity } from '../../domain/domain.entity';
import { DomainMapper } from '../../domain.mapper';
import { DomainResponseDto } from '../../dtos/domain.response.dto';
import { FindDomainByIdQuery } from '../../queries/find-domain-by-id/find-domain-by-id.query';
import { ConnectDomainCommand } from './connect-domain.command';
import { ConnectDomainRequest } from './connect-domain.request.dto';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('domains')
export class ConnectDomainHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: DomainMapper,
  ) {}

  @Post()
  @Version('1')
  @CheckPolicies({ action: 'create', subject: 'Domain' })
  @RequireScopes('domains:write')
  @ApiOperation({
    summary: 'Connect a domain',
    description:
      'Starts tracking a domain in the caller’s active organization. The domain is created in `draft` and becomes activatable once verified.',
  })
  @ApiResponse({ status: 201, type: DomainResponseDto })
  @ApiProblemResponse({
    status: 400,
    description: 'No active organization on the session',
    code: 'DOMAIN_005',
  })
  @ApiProblemResponse({
    status: 409,
    description: 'Domain is already tracked in this organization',
    code: 'DOMAIN_002',
  })
  async connect(
    @Req() request: RequestWithSession,
    @Body() body: ConnectDomainRequest,
  ): Promise<DomainResponseDto> {
    const organizationId = requireActiveOrganizationId(request);

    const domainId = await this.commandBus.execute<ConnectDomainCommand, AggregateID>(
      new ConnectDomainCommand({ organizationId, ...body }),
    );

    const domain = await this.queryBus.execute<FindDomainByIdQuery, DomainEntity>(
      new FindDomainByIdQuery({ domainId, organizationId }),
    );

    return this.mapper.toResponse(domain);
  }
}
