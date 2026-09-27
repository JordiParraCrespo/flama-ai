import { ApiProblemResponse } from '@flama/backend-core';
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminSuccessResponseDto } from '../../dtos/admin-user.response.dto';
import { RevokeUserSessionCommand } from './revoke-user-session.command';
import { RevokeUserSessionRequest } from './revoke-user-session.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class RevokeUserSessionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/sessions/revoke')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Revoke one of a user's sessions by id" })
  @ApiResponse({ status: 200, type: AdminSuccessResponseDto })
  @ApiProblemResponse({ status: 404, description: 'Session not found', code: 'ADMIN_009' })
  revokeUserSession(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: RevokeUserSessionRequest,
  ): Promise<AdminSuccessResponseDto> {
    return this.commandBus.execute(
      new RevokeUserSessionCommand({ headers: request.headers, userId, sessionId: body.sessionId }),
    );
  }
}
