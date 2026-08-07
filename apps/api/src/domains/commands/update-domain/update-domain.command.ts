import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { DomainProtocol, DomainStatus } from '@flama/shared';

export class UpdateDomainCommand extends CommandBase {
  readonly domainId: string;
  readonly organizationId: string;
  readonly protocol?: DomainProtocol;
  readonly status?: DomainStatus;
  /** `null` unassigns the owner; `undefined` leaves it unchanged. */
  readonly ownerId?: string | null;

  constructor(props: CommandProps<UpdateDomainCommand>) {
    super(props);
    this.domainId = props.domainId;
    this.organizationId = props.organizationId;
    this.protocol = props.protocol;
    this.status = props.status;
    this.ownerId = props.ownerId;
  }
}
