import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { RoleEntity } from '../../domain/role.entity';
import { RoleResponseDto } from '../../dtos/role.response.dto';
import { RoleMapper } from '../../roles.mapper';
import { FindUserRolesQuery } from './find-user-roles.query';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('users')
export class FindUserRolesHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: RoleMapper,
  ) {}

  @Get(':userId/roles')
  @Version('1')
  @CheckPolicies({ action: 'manage', subject: 'User' })
  @ApiOperation({ summary: "List a user's assigned roles" })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findUserRoles(@Param('userId', ParseUUIDPipe) userId: string): Promise<RoleResponseDto[]> {
    const roles = await this.queryBus.execute<FindUserRolesQuery, RoleEntity[]>(
      new FindUserRolesQuery(userId),
    );
    return roles.map((role) => this.mapper.toResponse(role));
  }
}
