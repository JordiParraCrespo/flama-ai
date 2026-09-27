import { Controller, Param, ParseUUIDPipe, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import { UnbanUserCommand } from './unban-user.command';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class UnbanUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/unban')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: 'Unban a user' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  unbanUser(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<AdminUserResponseDto> {
    return this.commandBus.execute(new UnbanUserCommand({ headers: request.headers, userId }));
  }
}
