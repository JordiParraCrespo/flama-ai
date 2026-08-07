import { ApiProblemResponse } from '@flama/backend-core';
import type { Paginated } from '@flama/backend-ddd';
import { DOMAIN_STATUSES } from '@flama/shared';
import { Controller, Get, Query, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { type RequestWithSession, requireActiveOrganizationId } from '../../active-organization';
import type { DomainEntity } from '../../domain/domain.entity';
import { DomainMapper } from '../../domain.mapper';
import { PaginatedDomainsResponseDto } from '../../dtos/paginated-domains.response.dto';
import { FindDomainsQuery } from './find-domains.query';
import { FindDomainsRequest } from './find-domains.request.dto';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('domains')
export class FindDomainsHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: DomainMapper,
  ) {}

  @Get()
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Domain' })
  @RequireScopes('domains:read')
  @ApiOperation({
    summary: 'List domains',
    description:
      'Lists domains in the caller’s active organization, narrowed to the domains the caller has access to.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({ name: 'status', required: false, enum: DOMAIN_STATUSES })
  @ApiQuery({
    name: 'ownerId',
    required: false,
    type: String,
    description: 'Filter by owner',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by hostname',
  })
  @ApiResponse({ status: 200, type: PaginatedDomainsResponseDto })
  @ApiProblemResponse({
    status: 400,
    description: 'No active organization on the session',
    code: 'DOMAIN_003',
  })
  async findAll(
    @Req() request: RequestWithSession,
    @CurrentUser() user: { id: string },
    @Query() query: FindDomainsRequest,
  ): Promise<PaginatedDomainsResponseDto> {
    const organizationId = requireActiveOrganizationId(request);

    const result = await this.queryBus.execute<FindDomainsQuery, Paginated<DomainEntity>>(
      new FindDomainsQuery({ organizationId, requesterId: user.id, ...query }),
    );

    return {
      data: result.data.map((domain) => this.mapper.toResponse(domain)),
      meta: {
        total: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.count / result.limit),
      },
    };
  }
}
