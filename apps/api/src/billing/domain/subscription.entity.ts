import { randomUUID } from 'node:crypto';
import {
  AggregateRoot,
  ArgumentNotProvidedException,
  type CreateEntityProps,
} from '@flama/backend-ddd';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  type BillingInterval,
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '@flama/shared';
import { SubscriptionActivatedDomainEvent } from './events/subscription-activated.domain-event';
import { SubscriptionCanceledDomainEvent } from './events/subscription-canceled.domain-event';

export interface SubscriptionProps {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  /** Human-readable plan name (Stripe price nickname or product name). */
  plan: string | null;
  /** Recurring amount in the currency's minor unit (e.g. cents). */
  unitAmount: number | null;
  currency: string | null;
  interval: BillingInterval | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

/** Mutable fields synced from Stripe on each subscription webhook. */
export interface SyncSubscriptionProps {
  stripeCustomerId: string;
  stripePriceId: string | null;
  plan: string | null;
  unitAmount: number | null;
  currency: string | null;
  interval: BillingInterval | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

export interface CreateSubscriptionProps extends SyncSubscriptionProps {
  userId: string;
  stripeSubscriptionId: string;
}

const isActiveStatus = (status: SubscriptionStatus): boolean =>
  (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);

/**
 * Subscription aggregate. A local mirror of a Stripe Subscription, kept in sync
 * through webhooks. Owns the invariants and the domain events raised on status
 * transitions (activation / cancellation).
 */
export class SubscriptionEntity extends AggregateRoot<SubscriptionProps> {
  /** Rehydrate an existing subscription (used by the mapper). */
  static create(create: CreateEntityProps<SubscriptionProps>): SubscriptionEntity {
    return new SubscriptionEntity(create);
  }

  /** Create a brand-new subscription from its first Stripe webhook. */
  static createNew(props: CreateSubscriptionProps): SubscriptionEntity {
    const subscription = new SubscriptionEntity({
      id: randomUUID(),
      props: {
        userId: props.userId,
        stripeSubscriptionId: props.stripeSubscriptionId,
        stripeCustomerId: props.stripeCustomerId,
        stripePriceId: props.stripePriceId,
        plan: props.plan,
        unitAmount: props.unitAmount,
        currency: props.currency,
        interval: props.interval,
        status: props.status,
        currentPeriodEnd: props.currentPeriodEnd,
        cancelAtPeriodEnd: props.cancelAtPeriodEnd,
        canceledAt: props.canceledAt,
      },
    });
    if (isActiveStatus(props.status)) {
      subscription.addEvent(
        new SubscriptionActivatedDomainEvent({
          aggregateId: subscription.id,
          userId: props.userId,
          stripeSubscriptionId: props.stripeSubscriptionId,
          plan: props.plan,
        }),
      );
    }
    return subscription;
  }

  get userId(): string {
    return this.props.userId;
  }

  get stripeSubscriptionId(): string {
    return this.props.stripeSubscriptionId;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get plan(): string | null {
    return this.props.plan;
  }

  /**
   * Apply the latest Stripe state. Raises `SubscriptionActivatedDomainEvent`
   * when transitioning into an active status and `SubscriptionCanceledDomainEvent`
   * when transitioning into `canceled`, so the sync is idempotent (no event is
   * raised when the status is unchanged).
   */
  sync(props: SyncSubscriptionProps): void {
    const previousStatus = this.props.status;

    this.props.stripeCustomerId = props.stripeCustomerId;
    this.props.stripePriceId = props.stripePriceId;
    this.props.plan = props.plan;
    this.props.unitAmount = props.unitAmount;
    this.props.currency = props.currency;
    this.props.interval = props.interval;
    this.props.status = props.status;
    this.props.currentPeriodEnd = props.currentPeriodEnd;
    this.props.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    this.props.canceledAt = props.canceledAt;
    this.setUpdatedAt(new Date());
    this.validate();

    const becameActive = !isActiveStatus(previousStatus) && isActiveStatus(props.status);
    const becameCanceled = previousStatus !== 'canceled' && props.status === 'canceled';

    if (becameActive) {
      this.addEvent(
        new SubscriptionActivatedDomainEvent({
          aggregateId: this.id,
          userId: this.props.userId,
          stripeSubscriptionId: this.props.stripeSubscriptionId,
          plan: this.props.plan,
        }),
      );
    }
    if (becameCanceled) {
      this.addEvent(
        new SubscriptionCanceledDomainEvent({
          aggregateId: this.id,
          userId: this.props.userId,
          stripeSubscriptionId: this.props.stripeSubscriptionId,
        }),
      );
    }
  }

  public validate(): void {
    if (!this.props.userId?.trim()) {
      throw new ArgumentNotProvidedException('Subscription.userId cannot be empty');
    }
    if (!this.props.stripeSubscriptionId?.trim()) {
      throw new ArgumentNotProvidedException('Subscription.stripeSubscriptionId cannot be empty');
    }
    if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(this.props.status)) {
      throw new ArgumentNotProvidedException(`Unknown subscription status: ${this.props.status}`);
    }
  }
}
