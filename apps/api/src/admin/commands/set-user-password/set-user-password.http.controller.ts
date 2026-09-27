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
import { SetUserPasswordCommand } from './set-user-password.command';
import { SetUserPasswordRequest } from './set-user-password.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class SetUserPasswordHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/set-password')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Set a user's password" })
  @ApiResponse({ status: 200, type: AdminSuccessResponseDto })
  setUserPassword(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: SetUserPasswordRequest,
  ): Promise<AdminSuccessResponseDto> {
    return this.commandBus.execute(
      new SetUserPasswordCommand({
        headers: request.headers,
        userId,
        newPassword: body.newPassword,
      }),
    );
  }
}
