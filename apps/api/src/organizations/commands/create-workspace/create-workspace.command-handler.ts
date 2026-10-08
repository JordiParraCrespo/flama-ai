import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { CreateWorkspaceCommand } from './create-workspace.command';

/** Creates a workspace (a Better Auth team) in an organization. Answers its id. */
@CommandHandler(CreateWorkspaceCommand)
export class CreateWorkspaceCommandHandler
  implements ICommandHandler<CreateWorkspaceCommand, AggregateID>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  async execute({ headers, input }: CreateWorkspaceCommand): Promise<AggregateID> {
    const workspace = await this.workspaces.create(headers, {
      name: input.name,
      organizationId: input.organizationId,
    });
    return workspace.id;
  }
}
