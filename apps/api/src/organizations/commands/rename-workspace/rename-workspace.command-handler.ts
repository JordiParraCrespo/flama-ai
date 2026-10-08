import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { RenameWorkspaceCommand } from './rename-workspace.command';

@CommandHandler(RenameWorkspaceCommand)
export class RenameWorkspaceCommandHandler
  implements ICommandHandler<RenameWorkspaceCommand, AggregateID>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  async execute({ headers, workspaceId, name }: RenameWorkspaceCommand): Promise<AggregateID> {
    const workspace = await this.workspaces.rename(headers, workspaceId, name);
    return workspace.id;
  }
}
