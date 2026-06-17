import type { Paginated } from '@flama/backend-ddd';
import { Controller, Get, Query, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleMapper } from '../../roles.mapper';
import { FindRolesQuery } from './find-roles.query';
import { FindRolesRequest } from './find-roles.request.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('roles')
export class FindRolesHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Get()
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Role' })
  @ApiOperation({ summary: 'List all roles' })
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
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by role name',
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: FindRolesRequest) {
    const result = await this.queryBus.execute<FindRolesQuery, Paginated<RoleEntity>>(
      new FindRolesQuery(query),
    );

    return {
      data: result.data.map((role) => this.mapper.toResponse(role)),
      meta: {
        total: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.count / result.limit),
      },
    };
  }
}
