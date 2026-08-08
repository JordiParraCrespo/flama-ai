import { ApiProblemResponse } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { ScopedRequest } from '../../../auth/scope-context';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { FindRoleByIdQuery } from '../../queries/find-role-by-id/find-role-by-id.query';
import { RoleMapper } from '../../roles.mapper';
import { UpdateRoleCommand } from './update-role.command';
import { UpdateRoleRequest } from './update-role.request.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('roles')
export class UpdateRoleHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Patch(':id')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Role' })
  @RequireScopes('roles:write')
  @ApiOperation({ summary: 'Update a role (description and/or permissions)' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiProblemResponse({ status: 404, description: 'Role not found', code: 'ROLE_001' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleRequest,
    @CurrentUser() actor: { id: string; role?: string },
    @Req() request: ScopedRequest,
  ): Promise<RoleResponseDto> {
    const roleId = await this.commandBus.execute<UpdateRoleCommand, AggregateID>(
      new UpdateRoleCommand({
        roleId: id,
        ...body,
        actorId: actor.id,
        actorRole: actor.role,
        activeOrganizationId: activeOrganizationIdOf(request),
      }),
    );
    const role = await this.queryBus.execute<FindRoleByIdQuery, RoleEntity>(
      new FindRoleByIdQuery(roleId),
    );
    return this.mapper.toResponse(role);
  }
}

/** The organization the caller is acting in, from their session. */
function activeOrganizationIdOf(request: ScopedRequest): string | null {
  const session = request.session as {
    activeOrganizationId?: string | null;
  } | null;
  return session?.activeOrganizationId ?? null;
}
