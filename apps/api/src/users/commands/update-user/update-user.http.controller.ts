import type { AggregateID } from '@flama/backend-ddd';
import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { UserEntity } from '../../domain/user.entity';
import { UserResponseDto } from '../../dtos/user.response.dto';
import { FindUserByIdQuery } from '../../queries/find-user-by-id/find-user-by-id.query';
import { UserMapper } from '../../user.mapper';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserRequest } from './update-user.request.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
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
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'USER_001: User not found' })
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
