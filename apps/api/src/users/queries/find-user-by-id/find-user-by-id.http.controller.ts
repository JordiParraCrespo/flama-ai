import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import type { UserEntity } from '../../domain/user.entity';
import { UserResponseDto } from '../../dtos/user.response.dto';
import { UserMapper } from '../../user.mapper';
import { FindUserByIdQuery } from './find-user-by-id.query';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('users')
export class FindUserByIdHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: UserMapper,
  ) {}

  @Get(':id')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'User' })
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'USER_001: User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.queryBus.execute<FindUserByIdQuery, UserEntity>(
      new FindUserByIdQuery(id),
    );
    return this.mapper.toResponse(user);
  }
}
