import { Controller, Delete, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { DeleteUserCommand } from './delete-user.command';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('users')
export class DeleteUserHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':id')
  @Version('1')
  @CheckPolicies({ action: 'delete', subject: 'User' })
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'USER_001: User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute<DeleteUserCommand, void>(new DeleteUserCommand({ userId: id }));
  }
}
