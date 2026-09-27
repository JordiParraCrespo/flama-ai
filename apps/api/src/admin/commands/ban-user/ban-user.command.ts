import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { BanInput } from '../../infrastructure/admin-auth.port';

export class BanUserCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly userId: string;
  readonly ban: BanInput;

  constructor(props: CommandProps<BanUserCommand>) {
    super(props);
    this.headers = props.headers;
    this.userId = props.userId;
    this.ban = props.ban;
  }
}
