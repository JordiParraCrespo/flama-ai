import { ApiAuthProblemResponses } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { OrganizationProblemResponses } from '../../decorators/organization-problem-responses.decorator';
import { OrganizationResponseDto } from '../../dtos/organization.response.dto';
import { FindOrganizationQuery } from '../../queries/find-organization/find-organization.query';
import { CreateOrganizationCommand } from './create-organization.command';
import { CreateOrganizationRequest } from './create-organization.request.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiAuthProblemResponses()
@OrganizationProblemResponses()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('organizations')
export class CreateOrganizationHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Version('1')
  @RequireScopes('organizations:write')
  @CheckPolicies({ action: 'create', subject: 'Organization' })
  @ApiOperation({ summary: 'Create an organization' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  async create(
    @Req() req: Request,
    @Body() body: CreateOrganizationRequest,
  ): Promise<OrganizationResponseDto> {
    const id = await this.commandBus.execute<CreateOrganizationCommand, AggregateID>(
      new CreateOrganizationCommand({ headers: req.headers, input: body }),
    );
    return this.queryBus.execute<FindOrganizationQuery, OrganizationResponseDto>(
      new FindOrganizationQuery({ organizationId: id }),
    );
  }
}
