import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import { GetUserQuery } from './get-user.query';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class GetUserHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('users/:id')
  @Version('1')
  @RequireScopes('admin:read')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: 'Get a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  getUser(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<AdminUserResponseDto> {
    return this.queryBus.execute(new GetUserQuery({ headers: request.headers, userId }));
  }
}
