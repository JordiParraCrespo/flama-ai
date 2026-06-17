import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Param, ParseUUIDPipe, Put, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { FindRoleByIdQuery } from '../../queries/find-role-by-id/find-role-by-id.query';
import { RoleMapper } from '../../roles.mapper';
import { UpdateRolePermissionsCommand } from './update-role-permissions.command';
import { UpdateRolePermissionsRequest } from './update-role-permissions.request.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('roles')
export class UpdateRolePermissionsHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Put(':id/permissions')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Role' })
  @ApiOperation({ summary: "Replace a role's permission set" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'ROLE_001: Role not found' })
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRolePermissionsRequest,
  ): Promise<RoleResponseDto> {
    const roleId = await this.commandBus.execute<UpdateRolePermissionsCommand, AggregateID>(
      new UpdateRolePermissionsCommand({
        roleId: id,
        permissions: body.permissions,
      }),
    );
    const role = await this.queryBus.execute<FindRoleByIdQuery, RoleEntity>(
      new FindRoleByIdQuery(roleId),
    );
    return this.mapper.toResponse(role);
  }
}
