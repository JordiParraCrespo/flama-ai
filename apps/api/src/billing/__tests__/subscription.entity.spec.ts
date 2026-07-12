import { describe, expect, it } from 'vitest';
import { SubscriptionActivatedDomainEvent } from '../domain/events/subscription-activated.domain-event';
import { SubscriptionCanceledDomainEvent } from '../domain/events/subscription-canceled.domain-event';
import { SubscriptionEntity, type SyncSubscriptionProps } from '../domain/subscription.entity';

const baseSync = (overrides: Partial<SyncSubscriptionProps> = {}): SyncSubscriptionProps => ({
  stripeCustomerId: 'cus_1',
  stripePriceId: 'price_1',
  plan: 'Pro',
  unitAmount: 1000,
  currency: 'usd',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  ...overrides,
});

const createNew = (status: SyncSubscriptionProps['status']) =>
  SubscriptionEntity.createNew({
    userId: 'user_1',
    stripeSubscriptionId: 'sub_1',
    ...baseSync({ status }),
  });

describe('SubscriptionEntity', () => {
  it('raises an activation event when created in an active status', () => {
    const subscription = createNew('active');
    expect(subscription.domainEvents).toHaveLength(1);
    expect(subscription.domainEvents[0]).toBeInstanceOf(SubscriptionActivatedDomainEvent);
  });

  it('raises no event when created in a non-active status', () => {
    const subscription = createNew('incomplete');
    expect(subscription.domainEvents).toHaveLength(0);
  });

  it('raises an activation event on transition into an active status', () => {
    const subscription = createNew('incomplete');
    subscription.sync(baseSync({ status: 'active' }));
    expect(subscription.domainEvents).toHaveLength(1);
    expect(subscription.domainEvents[0]).toBeInstanceOf(SubscriptionActivatedDomainEvent);
  });

  it('raises a cancellation event on transition into canceled', () => {
    const subscription = createNew('active');
    subscription.clearEvents();
    subscription.sync(baseSync({ status: 'canceled' }));
    expect(subscription.domainEvents).toHaveLength(1);
    expect(subscription.domainEvents[0]).toBeInstanceOf(SubscriptionCanceledDomainEvent);
  });

  it('is idempotent: re-syncing the same active status raises no event', () => {
    const subscription = createNew('active');
    subscription.clearEvents();
    subscription.sync(baseSync({ status: 'active', plan: 'Pro (annual)' }));
    expect(subscription.domainEvents).toHaveLength(0);
    expect(subscription.plan).toBe('Pro (annual)');
  });
});
