import { Body, Controller, Param, ParseUUIDPipe, Put, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { FindUserRolesQuery } from '../../queries/find-user-roles/find-user-roles.query';
import { RoleMapper } from '../../roles.mapper';
import { AssignUserRolesCommand } from './assign-user-roles.command';
import { AssignUserRolesRequest } from './assign-user-roles.request.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('users')
export class AssignUserRolesHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Put(':userId/roles')
  @Version('1')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "Replace a user's assigned roles" })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @ApiResponse({
    status: 404,
    description: 'USER_001 / ROLE_001: User or role not found',
  })
  async assign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: AssignUserRolesRequest,
  ): Promise<RoleResponseDto[]> {
    await this.commandBus.execute<AssignUserRolesCommand, void>(
      new AssignUserRolesCommand({ userId, roleIds: body.roleIds }),
    );
    const roles = await this.queryBus.execute<FindUserRolesQuery, RoleEntity[]>(
      new FindUserRolesQuery(userId),
    );
    return roles.map((role) => this.mapper.toResponse(role));
  }
}
