import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { AdminCreateUserDto } from '@flama/shared';

export class CreateUserCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly input: AdminCreateUserDto;

  constructor(props: CommandProps<CreateUserCommand>) {
    super(props);
    this.headers = props.headers;
    this.input = props.input;
  }
}
