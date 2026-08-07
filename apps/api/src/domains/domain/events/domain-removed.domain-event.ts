import { DomainEvent, type DomainEventProps } from '@flama/backend-ddd';

/**
 * Raised when a domain stops being tracked. Consumers detach the leads captured
 * from it (leads outlive the domain they came from), drop its cached metrics
 * and write the audit entry.
 */
export class DomainRemovedDomainEvent extends DomainEvent {
  readonly organizationId: string;
  readonly hostname: string;

  constructor(props: DomainEventProps<DomainRemovedDomainEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.hostname = props.hostname;
  }
}
