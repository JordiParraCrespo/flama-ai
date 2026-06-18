import { Controller, Delete, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { DeleteRoleCommand } from './delete-role.command';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('roles')
export class DeleteRoleHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':id')
  @Version('1')
  @CheckPolicies({ action: 'delete', subject: 'Role' })
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 403,
    description: 'ROLE_003: System roles cannot be deleted',
  })
  @ApiResponse({ status: 404, description: 'ROLE_001: Role not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute<DeleteRoleCommand, void>(new DeleteRoleCommand({ roleId: id }));
  }
}
