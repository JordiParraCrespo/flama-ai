import type { IncomingHttpHeaders } from 'node:http';
import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { CreateOrganizationDto } from '@flama/shared';

export class CreateOrganizationCommand extends CommandBase {
  readonly headers: IncomingHttpHeaders;
  readonly input: CreateOrganizationDto;
  /** The authenticated caller, who becomes the organization's owner. */
  readonly creatorId: string;

  constructor(props: CommandProps<CreateOrganizationCommand>) {
    super(props);
    this.headers = props.headers;
    this.input = props.input;
    this.creatorId = props.creatorId;
  }
}
