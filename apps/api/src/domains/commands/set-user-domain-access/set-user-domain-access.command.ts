import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class SetUserDomainAccessCommand extends CommandBase {
  readonly userId: string;
  readonly organizationId: string;
  readonly domainIds: string[];

  constructor(props: CommandProps<SetUserDomainAccessCommand>) {
    super(props);
    this.userId = props.userId;
    this.organizationId = props.organizationId;
    this.domainIds = props.domainIds;
  }
}
