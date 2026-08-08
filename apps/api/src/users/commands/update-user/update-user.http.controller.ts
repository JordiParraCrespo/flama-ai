import { ApiAuthProblemResponses, ApiProblemResponse } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { UserEntity } from '../../domain/user.entity';
import { UserResponseDto } from '../../dtos/user.response.dto';
import { FindUserByIdQuery } from '../../queries/find-user-by-id/find-user-by-id.query';
import { UserMapper } from '../../user.mapper';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserRequest } from './update-user.request.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiAuthProblemResponses()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('users')
export class UpdateUserHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: UserMapper,
  ) {}

  @Patch(':id')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'User' })
  @RequireScopes('users:write')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiProblemResponse({ status: 404, description: 'User not found', code: 'USER_001' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserRequest,
  ): Promise<UserResponseDto> {
    const userId = await this.commandBus.execute<UpdateUserCommand, AggregateID>(
      new UpdateUserCommand({ userId: id, ...body }),
    );
    const user = await this.queryBus.execute<FindUserByIdQuery, UserEntity>(
      new FindUserByIdQuery(userId),
    );
    return this.mapper.toResponse(user);
  }
}
