import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminSessionResponseDto } from '../../dtos/admin-user.response.dto';
import { ListUserSessionsQuery } from './list-user-sessions.query';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class ListUserSessionsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('users/:id/sessions')
  @Version('1')
  @RequireScopes('admin:read')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "List a user's sessions" })
  @ApiResponse({ status: 200, type: [AdminSessionResponseDto] })
  listUserSessions(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<AdminSessionResponseDto[]> {
    return this.queryBus.execute(new ListUserSessionsQuery({ headers: request.headers, userId }));
  }
}
