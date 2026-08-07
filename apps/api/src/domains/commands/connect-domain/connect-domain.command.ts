import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { DomainProtocol } from '@flama/shared';

export class ConnectDomainCommand extends CommandBase {
  readonly organizationId: string;
  readonly hostname: string;
  readonly protocol: DomainProtocol;
  readonly ownerId?: string;
  readonly importSearchConsole: boolean;
  readonly runInitialCrawl: boolean;

  constructor(props: CommandProps<ConnectDomainCommand>) {
    super(props);
    this.organizationId = props.organizationId;
    this.hostname = props.hostname;
    this.protocol = props.protocol;
    this.ownerId = props.ownerId;
    this.importSearchConsole = props.importSearchConsole;
    this.runInitialCrawl = props.runInitialCrawl;
  }
}
