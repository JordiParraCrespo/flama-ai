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
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import { SetUserRoleCommand } from './set-user-role.command';
import { SetUserRoleRequest } from './set-user-role.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class SetUserRoleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/role')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Set a user's global role" })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  setUserRole(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: SetUserRoleRequest,
  ): Promise<AdminUserResponseDto> {
    return this.commandBus.execute(
      new SetUserRoleCommand({ headers: request.headers, userId, role: body.role }),
    );
  }
}
