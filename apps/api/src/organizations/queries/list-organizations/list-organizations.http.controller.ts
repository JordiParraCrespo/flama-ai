import { ApiAuthProblemResponses } from '@flama/backend-core';
import { Controller, Get, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { OrganizationProblemResponses } from '../../decorators/organization-problem-responses.decorator';
import { OrganizationResponseDto } from '../../dtos/organization.response.dto';
import { ListOrganizationsQuery } from './list-organizations.query';

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiAuthProblemResponses()
@OrganizationProblemResponses()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('organizations')
export class ListOrganizationsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Version('1')
  @RequireScopes('organizations:read')
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  @ApiOperation({ summary: "List the caller's organizations" })
  @ApiResponse({ status: 200, type: [OrganizationResponseDto] })
  list(@Req() req: Request): Promise<OrganizationResponseDto[]> {
    return this.queryBus.execute<ListOrganizationsQuery, OrganizationResponseDto[]>(
      new ListOrganizationsQuery({ headers: req.headers }),
    );
  }
}
