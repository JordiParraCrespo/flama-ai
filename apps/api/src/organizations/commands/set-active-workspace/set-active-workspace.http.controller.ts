import { ApiAuthProblemResponses } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Controller, Param, ParseUUIDPipe, Post, Req, UseGuards, Version } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { WorkspaceProblemResponses } from '../../decorators/workspace-problem-responses.decorator';
import { WorkspaceResponseDto } from '../../dtos/workspace.response.dto';
import { FindWorkspaceQuery } from '../../queries/find-workspace/find-workspace.query';
import { SetActiveWorkspaceCommand } from './set-active-workspace.command';

@ApiTags('Workspaces')
@ApiBearerAuth()
@ApiAuthProblemResponses()
@WorkspaceProblemResponses()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('workspaces')
export class SetActiveWorkspaceHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(':id/set-active')
  @Version('1')
  @RequireScopes('workspaces:read')
  @CheckPolicies({ action: 'read', subject: 'Workspace' })
  @ApiOperation({ summary: 'Set the active workspace for the current session' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async setActive(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkspaceResponseDto> {
    await this.commandBus.execute<SetActiveWorkspaceCommand, AggregateID>(
      new SetActiveWorkspaceCommand({ headers: req.headers, workspaceId: id }),
    );
    return this.queryBus.execute<FindWorkspaceQuery, WorkspaceResponseDto>(
      new FindWorkspaceQuery({ workspaceId: id }),
    );
  }
}
