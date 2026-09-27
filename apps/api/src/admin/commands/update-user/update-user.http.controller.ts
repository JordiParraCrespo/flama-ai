import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateUserCommand } from './update-user.command';
import { AdminUpdateUserRequest } from './update-user.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class UpdateUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch('users/:id')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Update a user's profile fields" })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  updateUser(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: AdminUpdateUserRequest,
  ): Promise<AdminUserResponseDto> {
    return this.commandBus.execute(
      new UpdateUserCommand({ headers: request.headers, userId, data: body }),
    );
  }
}
