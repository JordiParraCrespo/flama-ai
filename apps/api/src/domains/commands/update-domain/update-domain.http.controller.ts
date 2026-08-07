import { ApiProblemResponse } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import type { AppAbility } from '@flama/shared';
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { FindDomainByIdQuery } from '../../queries/find-domain-by-id/find-domain-by-id.query';
import { UpdateDomainCommand } from './update-domain.command';
import { UpdateDomainRequest } from './update-domain.request.dto';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('domains')
export class UpdateDomainHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: DomainMapper,
  ) {}

  @Patch(':id')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Domain' })
  @RequireScopes('domains:write')
  @ApiOperation({
    summary: 'Update a domain',
    description:
      'Changes the protocol, owner or lifecycle status. Activating a domain requires it to be verified first.',
  })
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
  @ApiProblemResponse({
    status: 409,
    description: 'Domain must be verified before it can be activated',
    code: 'DOMAIN_004',
  })
  async update(
    @Req() request: RequestWithSession & { ability?: AppAbility },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDomainRequest,
  ): Promise<DomainResponseDto> {
    const organizationId = requireActiveOrganizationId(request);

    // Check access before mutating: the command would otherwise write first and
    // only fail on the follow-up read.
    const existing = await this.queryBus.execute<FindDomainByIdQuery, DomainEntity>(
      new FindDomainByIdQuery({ domainId: id, organizationId }),
    );
    assertCanReachDomain(request.ability, 'update', existing);

    const domainId = await this.commandBus.execute<UpdateDomainCommand, AggregateID>(
      new UpdateDomainCommand({ domainId: id, organizationId, ...body }),
    );

    const domain = await this.queryBus.execute<FindDomainByIdQuery, DomainEntity>(
      new FindDomainByIdQuery({ domainId, organizationId }),
    );

    return this.mapper.toResponse(domain);
  }
}
