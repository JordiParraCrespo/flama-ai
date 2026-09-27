import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import type { SessionSwitch } from '../../infrastructure/admin-auth.port';
import { ImpersonateUserCommand } from './impersonate-user.command';

@ApiAdmin()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('admin')
export class ImpersonateUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/:id/impersonate')
  @Version('1')
  @RequireScopes('admin:write')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: 'Impersonate a user (issues an impersonation session)' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async impersonateUser(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<AdminUserResponseDto> {
    const { user, cookies }: SessionSwitch = await this.commandBus.execute(
      new ImpersonateUserCommand({ headers: request.headers, userId }),
    );
    if (cookies.length > 0) response.setHeader('set-cookie', cookies);
    return user;
  }
}
