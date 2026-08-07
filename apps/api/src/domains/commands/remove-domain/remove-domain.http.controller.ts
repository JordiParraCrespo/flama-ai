import { ApiProblemResponse } from '@flama/backend-core';
import type { AppAbility } from '@flama/shared';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { assertCanReachDomain } from '../../domain-access.guard-helper';
import { FindDomainByIdQuery } from '../../queries/find-domain-by-id/find-domain-by-id.query';
import { RemoveDomainCommand } from './remove-domain.command';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('domains')
export class RemoveDomainHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies({ action: 'delete', subject: 'Domain' })
  @RequireScopes('domains:write')
  @ApiOperation({
    summary: 'Remove a domain',
    description:
      'Stops tracking the domain. Leads captured from it are kept and detached rather than deleted.',
  })
  @ApiResponse({ status: 204, description: 'Domain removed' })
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
  async remove(
    @Req() request: RequestWithSession & { ability?: AppAbility },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const organizationId = requireActiveOrganizationId(request);

    const domain = await this.queryBus.execute<FindDomainByIdQuery, DomainEntity>(
      new FindDomainByIdQuery({ domainId: id, organizationId }),
    );
    assertCanReachDomain(request.ability, 'delete', domain);

    await this.commandBus.execute(new RemoveDomainCommand({ domainId: id, organizationId }));
  }
}
