import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { FindRoleByIdQuery } from '../../queries/find-role-by-id/find-role-by-id.query';
import { RoleMapper } from '../../roles.mapper';
import { UpdateRoleCommand } from './update-role.command';
import { UpdateRoleRequest } from './update-role.request.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
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
  @ApiOperation({ summary: 'Update a role (description and/or permissions)' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'ROLE_001: Role not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleRequest,
  ): Promise<RoleResponseDto> {
    const roleId = await this.commandBus.execute<UpdateRoleCommand, AggregateID>(
      new UpdateRoleCommand({ roleId: id, ...body }),
    );
    const role = await this.queryBus.execute<FindRoleByIdQuery, RoleEntity>(
      new FindRoleByIdQuery(roleId),
    );
    return this.mapper.toResponse(role);
  }
}
