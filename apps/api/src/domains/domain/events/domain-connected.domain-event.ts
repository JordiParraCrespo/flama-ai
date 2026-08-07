import { DomainEvent, type DomainEventProps } from '@flama/backend-ddd';

/**
 * Raised when a domain is first tracked. Consumers kick off the optional
 * on-connect work the caller asked for (Search Console import, initial crawl)
 * and write the `domain.connected` audit entry.
 */
export class DomainConnectedDomainEvent extends DomainEvent {
  readonly organizationId: string;
  readonly hostname: string;
  readonly importSearchConsole: boolean;
  readonly runInitialCrawl: boolean;

  constructor(props: DomainEventProps<DomainConnectedDomainEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.hostname = props.hostname;
    this.importSearchConsole = props.importSearchConsole;
    this.runInitialCrawl = props.runInitialCrawl;
  }
}
