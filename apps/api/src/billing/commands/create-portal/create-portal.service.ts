import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { BILLING_CUSTOMER_REPOSITORY, PAYMENT_GATEWAY } from '../../billing.di-tokens';
import type { BillingCustomerRepositoryPort } from '../../database/billing-customer.repository.port';
import { BillingErrors } from '../../domain/billing.errors';
import type { PaymentGatewayPort } from '../../infrastructure/payment-gateway.port';
import { CreatePortalCommand } from './create-portal.command';

/**
 * Opens a Stripe Customer Portal session so the user can manage or cancel their
 * subscription. Returns the Stripe URL for the controller to redirect to.
 */
@CommandHandler(CreatePortalCommand)
export class CreatePortalService implements ICommandHandler<CreatePortalCommand, string> {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGatewayPort,
    @Inject(BILLING_CUSTOMER_REPOSITORY)
    private readonly customers: BillingCustomerRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreatePortalCommand): Promise<string> {
    const customer = await this.customers.findOneByUserId(command.userId);
    if (customer.isNone()) throw new AppError(BillingErrors.CUSTOMER_NOT_FOUND);

    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? '';
    const returnUrl =
      command.returnUrl ??
      this.configService.get<string>('stripe.portalReturnUrl') ??
      `${frontendUrl}/billing`;

    return this.gateway.createPortalSession({
      customerId: customer.unwrap().stripeCustomerId,
      returnUrl,
    });
  }
}
