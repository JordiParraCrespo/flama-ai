import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class RemoveDomainCommand extends CommandBase {
  readonly domainId: string;
  readonly organizationId: string;

  constructor(props: CommandProps<RemoveDomainCommand>) {
    super(props);
    this.domainId = props.domainId;
    this.organizationId = props.organizationId;
  }
}
