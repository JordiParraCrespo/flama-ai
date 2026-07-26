import { AppError } from '@flama/backend-core';
import type { BillingInterval, SubscriptionStatus } from '@flama/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingErrors } from '../domain/billing.errors';
import type {
  BillingWebhookEvent,
  CreateCheckoutParams,
  CreatePortalParams,
  NormalizedSubscription,
  PaymentGatewayPort,
} from './payment-gateway.port';

/**
 * Stripe implementation of the {@link PaymentGatewayPort}. Owns all Stripe SDK
 * interaction: creating customers, hosted Checkout and Customer Portal sessions,
 * and verifying + normalizing webhooks. When no secret key is configured every
 * operation fails fast with `BILLING_001` so the app still boots.
 */
@Injectable()
export class StripePaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(StripePaymentGateway.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;

  constructor(configService: ConfigService) {
    const secretKey = configService.get<string>('stripe.secretKey');
    this.webhookSecret = configService.get<string>('stripe.webhookSecret');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  isEnabled(): boolean {
    return this.stripe !== null;
  }

  async createCustomer(params: { userId: string; email?: string }): Promise<string> {
    const customer = await this.client().customers.create({
      email: params.email,
      metadata: { userId: params.userId },
    });
    return customer.id;
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
    const session = await this.client().checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      subscription_data: { metadata: { userId: params.userId } },
    });
    if (!session.url) throw new AppError(BillingErrors.CHECKOUT_FAILED);
    return session.url;
  }

  async createPortalSession(params: CreatePortalParams): Promise<string> {
    const session = await this.client().billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return session.url;
  }

  constructEvent(payload: Buffer | string, signature: string): BillingWebhookEvent {
    const stripe = this.client();
    if (!this.webhookSecret) throw new AppError(BillingErrors.NOT_CONFIGURED);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new AppError(BillingErrors.WEBHOOK_SIGNATURE_INVALID);
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return {
          type: 'subscription.upsert',
          data: this.normalizeSubscription(event.data.object),
        };
      default:
        return { type: 'ignored' };
    }
  }

  private client(): Stripe {
    if (!this.stripe) throw new AppError(BillingErrors.NOT_CONFIGURED);
    return this.stripe;
  }

  private normalizeSubscription(subscription: Stripe.Subscription): NormalizedSubscription {
    const item = subscription.items.data[0];
    const price = item?.price;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    // `current_period_end` lives on the subscription in older API versions and
    // on the subscription item in newer ones — read whichever is present.
    const periodEndUnix =
      (item as { current_period_end?: number } | undefined)?.current_period_end ??
      (subscription as unknown as { current_period_end?: number }).current_period_end ??
      null;

    return {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: price?.id ?? null,
      plan: price?.nickname ?? null,
      unitAmount: price?.unit_amount ?? null,
      currency: price?.currency ?? null,
      interval: (price?.recurring?.interval as BillingInterval | undefined) ?? null,
      status: subscription.status as SubscriptionStatus,
      currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      userId: subscription.metadata?.userId ?? null,
    };
  }
}
