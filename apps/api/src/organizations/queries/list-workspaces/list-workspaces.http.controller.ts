import { ApiAuthProblemResponses } from '@flama/backend-core';
import { Controller, Get, Query, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { WorkspaceProblemResponses } from '../../decorators/workspace-problem-responses.decorator';
import { WorkspaceResponseDto } from '../../dtos/workspace.response.dto';
import { ListWorkspacesQuery } from './list-workspaces.query';

@ApiTags('Workspaces')
@ApiBearerAuth()
@ApiAuthProblemResponses()
@WorkspaceProblemResponses()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('workspaces')
export class ListWorkspacesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Version('1')
  @RequireScopes('workspaces:read')
  @CheckPolicies({ action: 'read', subject: 'Workspace' })
  @ApiOperation({
    summary: "List an organization's workspaces (defaults to the active org)",
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  list(
    @Req() req: Request,
    @Query('organizationId') organizationId?: string,
  ): Promise<WorkspaceResponseDto[]> {
    return this.queryBus.execute<ListWorkspacesQuery, WorkspaceResponseDto[]>(
      new ListWorkspacesQuery({ headers: req.headers, organizationId }),
    );
  }
}
