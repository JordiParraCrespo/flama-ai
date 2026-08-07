import { DomainEvent, type DomainEventProps } from '@flama/backend-ddd';
import type { DomainStatus } from '@flama/shared';

/**
 * Raised when a domain moves between `draft`, `active` and `paused`. Pausing
 * must stop metric ingestion, so the scheduler listens for this rather than
 * re-reading every domain's status on each run.
 */
export class DomainStatusChangedDomainEvent extends DomainEvent {
  readonly organizationId: string;
  readonly hostname: string;
  readonly previousStatus: DomainStatus;
  readonly status: DomainStatus;

  constructor(props: DomainEventProps<DomainStatusChangedDomainEvent>) {
    super(props);
    this.organizationId = props.organizationId;
    this.hostname = props.hostname;
    this.previousStatus = props.previousStatus;
    this.status = props.status;
  }
}
