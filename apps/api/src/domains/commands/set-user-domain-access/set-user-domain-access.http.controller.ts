import { ApiProblemResponse } from '@flama/backend-core';
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
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
import { UserDomainAccessResponseDto } from '../../dtos/user-domain-access.response.dto';
import { FindUserDomainAccessQuery } from '../../queries/find-user-domain-access/find-user-domain-access.query';
import { SetUserDomainAccessCommand } from './set-user-domain-access.command';
import { SetUserDomainAccessRequest } from './set-user-domain-access.request.dto';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('users')
export class SetUserDomainAccessHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put(':userId/domains')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Domain' })
  @RequireScopes('domains:write')
  @ApiOperation({
    summary: 'Replace a user’s domain access',
    description:
      'Restricts the user to the given domains. An empty list clears the restriction, returning them to workspace-wide access under their role.',
  })
  @ApiResponse({ status: 200, type: UserDomainAccessResponseDto })
  @ApiProblemResponse({
    status: 403,
    description: 'Target user is not a member of this organization',
    code: 'DOMAIN_005',
  })
  @ApiProblemResponse({
    status: 404,
    description: 'One or more domain ids are unknown in this organization',
    code: 'DOMAIN_001',
  })
  async set(
    @Req() request: RequestWithSession,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: SetUserDomainAccessRequest,
  ): Promise<UserDomainAccessResponseDto> {
    const organizationId = requireActiveOrganizationId(request);

    await this.commandBus.execute(
      new SetUserDomainAccessCommand({
        userId,
        organizationId,
        domainIds: body.domainIds,
      }),
    );

    return this.queryBus.execute<FindUserDomainAccessQuery, UserDomainAccessResponseDto>(
      new FindUserDomainAccessQuery({ userId, organizationId }),
    );
  }
}
