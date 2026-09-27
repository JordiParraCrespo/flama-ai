import { Body, Controller, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import { CreateUserCommand } from './create-user.command';
import { AdminCreateUserRequest } from './create-user.request.dto';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class CreateUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, type: AdminUserResponseDto })
  createUser(
    @Req() request: Request,
    @Body() body: AdminCreateUserRequest,
  ): Promise<AdminUserResponseDto> {
    return this.commandBus.execute(
      new CreateUserCommand({ headers: request.headers, input: body }),
    );
  }
}
