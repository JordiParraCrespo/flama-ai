import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { AddMemberDto } from '@flama/shared';

export class AddMemberCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly organizationId: string;
  readonly input: AddMemberDto;

  constructor(props: CommandProps<AddMemberCommand>) {
    super(props);
    this.headers = props.headers;
    this.organizationId = props.organizationId;
    this.input = props.input;
  }
}
