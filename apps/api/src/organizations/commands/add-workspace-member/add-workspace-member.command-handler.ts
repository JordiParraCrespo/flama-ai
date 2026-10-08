import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { AddWorkspaceMemberCommand } from './add-workspace-member.command';

/** Puts a user in a workspace. Answers the id of their place in it. */
@CommandHandler(AddWorkspaceMemberCommand)
export class AddWorkspaceMemberCommandHandler
  implements ICommandHandler<AddWorkspaceMemberCommand, AggregateID>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  async execute({ headers, workspaceId, userId }: AddWorkspaceMemberCommand): Promise<AggregateID> {
    const member = await this.workspaces.addMember(headers, workspaceId, userId);
    return member.id;
  }
}
