import { Controller, Post, Req, Res, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { NoPolicy } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { ApiAdmin } from '../../decorators/api-admin.decorator';
import { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import type { SessionSwitch } from '../../infrastructure/admin-auth.port';
import { StopImpersonatingCommand } from './stop-impersonating.command';

@ApiAdmin()
@UseGuards(ApiAuthGuard)
@Controller('admin')
export class StopImpersonatingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('stop-impersonating')
  @NoPolicy('ends the caller’s own impersonation session; holding no admin power is the point')
  @Version('1')
  @RequireScopes('admin:write')
  @ApiOperation({ summary: 'Stop impersonating and restore the admin session' })
  @ApiResponse({ status: 200, type: AdminUserResponseDto })
  async stopImpersonating(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminUserResponseDto> {
    const { user, cookies }: SessionSwitch = await this.commandBus.execute(
      new StopImpersonatingCommand({ headers: request.headers }),
    );
    if (cookies.length > 0) response.setHeader('set-cookie', cookies);
    return user;
  }
}
