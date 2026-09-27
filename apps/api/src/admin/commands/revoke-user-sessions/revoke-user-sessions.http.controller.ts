import { Controller, Param, ParseUUIDPipe, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminSuccessResponseDto } from '../../dtos/admin-user.response.dto';
import { RevokeUserSessionsCommand } from './revoke-user-sessions.command';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class RevokeUserSessionsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/revoke-sessions')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Revoke all of a user's sessions" })
  @ApiResponse({ status: 200, type: AdminSuccessResponseDto })
  revokeUserSessions(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<AdminSuccessResponseDto> {
    return this.commandBus.execute(
      new RevokeUserSessionsCommand({ headers: request.headers, userId }),
    );
  }
}
