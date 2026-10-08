import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class AcceptInvitationCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly invitationId: string;

  constructor(props: CommandProps<AcceptInvitationCommand>) {
    super(props);
    this.headers = props.headers;
    this.invitationId = props.invitationId;
  }
}
