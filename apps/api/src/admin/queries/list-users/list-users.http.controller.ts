import { Controller, Get, Query, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserListResponseDto } from '../../dtos/admin-user.response.dto';
import { ListUsersQuery } from './list-users.query';
import { ListUsersRequest } from './list-users.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class ListUsersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('users')
  @Version('1')
  @RequireScopes('admin:read')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'searchValue', required: false })
  @ApiQuery({ name: 'searchField', required: false, enum: ['email', 'name'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, type: AdminUserListResponseDto })
  listUsers(
    @Req() request: Request,
    @Query() filter: ListUsersRequest,
  ): Promise<AdminUserListResponseDto> {
    return this.queryBus.execute(new ListUsersQuery({ headers: request.headers, filter }));
  }
}
