import type { Paginated } from '@flama/backend-ddd';
import { Controller, Get, Query, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { UserEntity } from '../../domain/user.entity';
import { UserMapper } from '../../user.mapper';
import { FindUsersQuery } from './find-users.query';
import { FindUsersRequest } from './find-users.request.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('users')
export class FindUsersHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: UserMapper,
  ) {}

  @Get()
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'User' })
  @ApiOperation({ summary: 'List all users' })
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
    name: 'role',
    required: false,
    enum: ['admin', 'user'],
    description: 'Filter by role',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: FindUsersRequest) {
    const result = await this.queryBus.execute<FindUsersQuery, Paginated<UserEntity>>(
      new FindUsersQuery(query),
    );

    return {
      data: result.data.map((user) => this.mapper.toResponse(user)),
      meta: {
        total: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.count / result.limit),
      },
    };
  }
}
