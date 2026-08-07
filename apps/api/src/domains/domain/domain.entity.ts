import { randomUUID } from 'node:crypto';
import {
  AggregateRoot,
  ArgumentNotProvidedException,
  type CreateEntityProps,
} from '@flama/backend-ddd';
import type { DomainProtocol, DomainStatus } from '@flama/shared';
import { DomainConnectedDomainEvent } from './events/domain-connected.domain-event';
import { DomainRemovedDomainEvent } from './events/domain-removed.domain-event';
import { DomainStatusChangedDomainEvent } from './events/domain-status-changed.domain-event';
import { Hostname } from './value-objects/hostname.value-object';

export interface DomainProps {
  organizationId: string;
  hostname: Hostname;
  protocol: DomainProtocol;
  status: DomainStatus;
  /** Member responsible for the domain, or `null` when unassigned. */
  ownerId: string | null;
  importSearchConsole: boolean;
  runInitialCrawl: boolean;
  verifiedAt: Date | null;
  lastCrawledAt: Date | null;
}

export interface ConnectDomainProps {
  organizationId: string;
  hostname: Hostname;
  protocol: DomainProtocol;
  ownerId?: string | null;
  importSearchConsole: boolean;
  runInitialCrawl: boolean;
}

export interface UpdateDomainProps {
  protocol?: DomainProtocol;
  status?: DomainStatus;
  ownerId?: string | null;
}

/**
 * A domain tracked by the workspace — the attribution anchor everything else
 * hangs off: leads record the domain they were captured on, and search metrics
 * roll up per domain.
 *
 * A newly connected domain starts as `draft` and only becomes `active` once it
 * is verified, so nothing ingests metrics for a hostname the workspace has not
 * proven it controls.
 */
export class DomainEntity extends AggregateRoot<DomainProps> {
  static create(create: CreateEntityProps<DomainProps>): DomainEntity {
    return new DomainEntity(create);
  }

  /** Track a new domain and raise the on-connect work it asked for. */
  static connect(props: ConnectDomainProps): DomainEntity {
    const domain = new DomainEntity({
      id: randomUUID(),
      props: {
        organizationId: props.organizationId,
        hostname: props.hostname,
        protocol: props.protocol,
        status: 'draft',
        ownerId: props.ownerId ?? null,
        importSearchConsole: props.importSearchConsole,
        runInitialCrawl: props.runInitialCrawl,
        verifiedAt: null,
        lastCrawledAt: null,
      },
    });

    domain.addEvent(
      new DomainConnectedDomainEvent({
        aggregateId: domain.id,
        organizationId: props.organizationId,
        hostname: props.hostname.value,
        importSearchConsole: props.importSearchConsole,
        runInitialCrawl: props.runInitialCrawl,
        reason:
          'Domain was connected; the requested Search Console import and initial crawl are owed',
      }),
    );

    return domain;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get hostname(): string {
    return this.props.hostname.value;
  }

  get protocol(): DomainProtocol {
    return this.props.protocol;
  }

  get status(): DomainStatus {
    return this.props.status;
  }

  get ownerId(): string | null {
    return this.props.ownerId;
  }

  get importSearchConsole(): boolean {
    return this.props.importSearchConsole;
  }

  get runInitialCrawl(): boolean {
    return this.props.runInitialCrawl;
  }

  get verifiedAt(): Date | null {
    return this.props.verifiedAt;
  }

  get lastCrawledAt(): Date | null {
    return this.props.lastCrawledAt;
  }

  get isVerified(): boolean {
    return this.props.verifiedAt !== null;
  }

  /** The canonical URL the UI links out to. */
  get url(): string {
    return `${this.props.protocol}://${this.props.hostname.value}`;
  }

  /**
   * Apply a partial update, ignoring fields left `undefined`. A `null` ownerId
   * is meaningful — it unassigns the current owner — so it is distinguished
   * from an absent one.
   */
  update(props: UpdateDomainProps): void {
    if (props.protocol !== undefined) this.props.protocol = props.protocol;
    if (props.ownerId !== undefined) this.props.ownerId = props.ownerId;
    if (props.status !== undefined) this.changeStatus(props.status);
    this.setUpdatedAt(new Date());
    this.validate();
  }

  /** Record a successful ownership check, allowing the domain to go active. */
  markVerified(at: Date = new Date()): void {
    this.props.verifiedAt = at;
    this.setUpdatedAt(new Date());
  }

  /** Record that a crawl finished, for the "last crawled" column. */
  markCrawled(at: Date = new Date()): void {
    this.props.lastCrawledAt = at;
    this.setUpdatedAt(new Date());
  }

  /** Stop tracking the domain and raise the cleanup its removal owes. */
  remove(): void {
    this.addEvent(
      new DomainRemovedDomainEvent({
        aggregateId: this.id,
        organizationId: this.props.organizationId,
        hostname: this.props.hostname.value,
        reason: 'Domain was removed; captured leads must be detached and cached metrics dropped',
      }),
    );
  }

  /**
   * Move between lifecycle states, raising an event so metric ingestion can
   * start or stop. Activating an unverified domain is refused: it would ingest
   * data for a hostname the workspace has not proven it controls.
   */
  private changeStatus(status: DomainStatus): void {
    const previousStatus = this.props.status;
    if (previousStatus === status) return;

    if (status === 'active' && !this.isVerified) {
      throw new DomainNotVerifiedError(this.props.hostname.value);
    }

    this.props.status = status;
    this.addEvent(
      new DomainStatusChangedDomainEvent({
        aggregateId: this.id,
        organizationId: this.props.organizationId,
        hostname: this.props.hostname.value,
        previousStatus,
        status,
        reason: `Domain moved from ${previousStatus} to ${status}; metric ingestion must follow`,
      }),
    );
  }

  public validate(): void {
    if (!this.props.organizationId) {
      throw new ArgumentNotProvidedException('Domain organizationId cannot be empty');
    }
  }
}

/**
 * Thrown when activation is attempted on an unverified domain. Kept in the
 * domain layer (no HTTP status) and translated to `DOMAIN_004` by the handler.
 */
export class DomainNotVerifiedError extends Error {
  constructor(hostname: string) {
    super(`Domain ${hostname} must be verified before it can be activated`);
    this.name = 'DomainNotVerifiedError';
  }
}
