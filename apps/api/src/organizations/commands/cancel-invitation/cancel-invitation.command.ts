import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class CancelInvitationCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly invitationId: string;

  constructor(props: CommandProps<CancelInvitationCommand>) {
    super(props);
    this.headers = props.headers;
    this.invitationId = props.invitationId;
  }
}
