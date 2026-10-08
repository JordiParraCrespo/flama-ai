import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { CreateWorkspaceDto } from '@flama/shared';

export class CreateWorkspaceCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly input: CreateWorkspaceDto;

  constructor(props: CommandProps<CreateWorkspaceCommand>) {
    super(props);
    this.headers = props.headers;
    this.input = props.input;
  }
}
