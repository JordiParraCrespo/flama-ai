import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { AdminUpdateUserDto } from '@flama/shared';

export class UpdateUserCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly userId: string;
  readonly data: AdminUpdateUserDto;

  constructor(props: CommandProps<UpdateUserCommand>) {
    super(props);
    this.headers = props.headers;
    this.userId = props.userId;
    this.data = props.data;
  }
}
