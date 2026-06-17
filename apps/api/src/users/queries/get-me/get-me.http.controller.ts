import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { UserEntity } from '../../domain/user.entity';
import { UserResponseDto } from '../../dtos/user.response.dto';
import { UserMapper } from '../../user.mapper';
import { FindUserByIdQuery } from '../find-user-by-id/find-user-by-id.query';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class GetMeHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: UserMapper,
  ) {}

  @Get('me')
  @Version('1')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async me(@CurrentUser('id') userId: string): Promise<UserResponseDto> {
    const user = await this.queryBus.execute<FindUserByIdQuery, UserEntity>(
      new FindUserByIdQuery(userId),
    );
    return this.mapper.toResponse(user);
  }
}
