import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { RemoveWorkspaceMemberCommand } from './remove-workspace-member.command';

@CommandHandler(RemoveWorkspaceMemberCommand)
export class RemoveWorkspaceMemberCommandHandler
  implements ICommandHandler<RemoveWorkspaceMemberCommand, void>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  execute({ headers, workspaceId, userId }: RemoveWorkspaceMemberCommand): Promise<void> {
    return this.workspaces.removeMember(headers, workspaceId, userId);
  }
}
