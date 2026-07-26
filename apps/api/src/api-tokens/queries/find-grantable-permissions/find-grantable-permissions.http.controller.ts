import { PERMISSION_GROUPS, type Scope } from '@flama/shared';
import { Controller, Get, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import type { ScopedRequest } from '../../../auth/scope-context';
import { PermissionCatalogResponseDto } from '../../dtos/permission-catalog.response.dto';
import { FindGrantablePermissionsQuery } from './find-grantable-permissions.query';

@ApiTags('API tokens')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard)
@Controller('tokens')
export class FindGrantablePermissionsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('permissions')
  @Version('1')
  @RequireScopes('tokens:read')
  @ApiOperation({
    summary: 'List the permission catalog and what the caller may grant',
    description:
      'Drives the permission picker on the token-creation screen and the CLI’s --permissions validation.',
  })
  @ApiResponse({ status: 200, type: PermissionCatalogResponseDto })
  async permissions(
    @Req() request: ScopedRequest,
    @CurrentUser() user: { id: string; role?: string },
  ): Promise<PermissionCatalogResponseDto> {
    const session = request.session as {
      activeOrganizationId?: string | null;
    } | null;

    const grantable = await this.queryBus.execute<FindGrantablePermissionsQuery, Scope[]>(
      new FindGrantablePermissionsQuery({
        userId: user.id,
        role: user.role,
        activeOrganizationId: session?.activeOrganizationId ?? null,
      }),
    );

    return { groups: PERMISSION_GROUPS, grantable };
  }
}
