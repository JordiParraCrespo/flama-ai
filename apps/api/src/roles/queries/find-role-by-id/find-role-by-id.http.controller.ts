import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { RoleMapper } from '../../roles.mapper';
import { FindRoleByIdQuery } from './find-role-by-id.query';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('roles')
export class FindRoleByIdHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Get(':id')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Role' })
  @RequireScopes('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'ROLE_001: Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleResponseDto> {
    const role = await this.queryBus.execute<FindRoleByIdQuery, RoleEntity>(
      new FindRoleByIdQuery(id),
    );
    return this.mapper.toResponse(role);
  }
}
