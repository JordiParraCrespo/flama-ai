import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { SetActiveWorkspaceCommand } from './set-active-workspace.command';

/** Selects a workspace for the caller's session. */
@CommandHandler(SetActiveWorkspaceCommand)
export class SetActiveWorkspaceCommandHandler
  implements ICommandHandler<SetActiveWorkspaceCommand, AggregateID>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  async execute({ headers, workspaceId }: SetActiveWorkspaceCommand): Promise<AggregateID> {
    await this.workspaces.setActive(headers, workspaceId);
    return workspaceId;
  }
}
