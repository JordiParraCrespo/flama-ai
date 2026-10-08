import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { UpdateOrganizationDto } from '@flama/shared';

export class UpdateOrganizationCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly organizationId: string;
  readonly input: UpdateOrganizationDto;

  constructor(props: CommandProps<UpdateOrganizationCommand>) {
    super(props);
    this.headers = props.headers;
    this.organizationId = props.organizationId;
    this.input = props.input;
  }
}
