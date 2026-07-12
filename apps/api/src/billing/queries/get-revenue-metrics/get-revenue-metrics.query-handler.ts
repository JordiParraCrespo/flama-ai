import { ACTIVE_SUBSCRIPTION_STATUSES, type BillingInterval } from '@flama/shared';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SUBSCRIPTION_REPOSITORY } from '../../billing.di-tokens';
import type { SubscriptionRepositoryPort } from '../../database/subscription.repository.port';
import { RevenueMetricsResponseDto } from '../../dtos/revenue-metrics.response.dto';
import { GetRevenueMetricsQuery } from './get-revenue-metrics.query';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Normalize a recurring amount to its monthly-equivalent minor units. */
function toMonthlyAmount(amount: number, interval: BillingInterval | null): number {
  switch (interval) {
    case 'year':
      return amount / 12;
    case 'week':
      return (amount * 52) / 12;
    case 'day':
      return amount * 30;
    default:
      return amount; // 'month' or unknown
  }
}

/**
 * Computes aggregate revenue metrics (MRR, ARR, counts, approximate churn) from
 * the locally synced subscription table — no live Stripe calls.
 */
@QueryHandler(GetRevenueMetricsQuery)
export class GetRevenueMetricsQueryHandler
  implements IQueryHandler<GetRevenueMetricsQuery, RevenueMetricsResponseDto>
{
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepositoryPort,
  ) {}

  async execute(): Promise<RevenueMetricsResponseDto> {
    const [active, trialing, pastDue, canceled, revenueSubscriptions] = await Promise.all([
      this.subscriptions.countByStatus('active'),
      this.subscriptions.countByStatus('trialing'),
      this.subscriptions.countByStatus('past_due'),
      this.subscriptions.countByStatus('canceled'),
      this.subscriptions.findByStatuses(ACTIVE_SUBSCRIPTION_STATUSES),
    ]);
    const canceledLast30Days = await this.subscriptions.countCanceledSince(
      new Date(Date.now() - THIRTY_DAYS_MS),
    );

    let mrr = 0;
    let currency = 'usd';
    for (const subscription of revenueSubscriptions) {
      const props = subscription.getProps();
      if (props.unitAmount != null) {
        mrr += toMonthlyAmount(props.unitAmount, props.interval);
      }
      if (props.currency) currency = props.currency;
    }
    mrr = Math.round(mrr);

    const activeLike = active + trialing + pastDue;
    const churnDenominator = activeLike + canceledLast30Days;
    const churnRate = churnDenominator > 0 ? canceledLast30Days / churnDenominator : 0;

    const dto = new RevenueMetricsResponseDto();
    dto.currency = currency;
    dto.mrr = mrr;
    dto.arr = mrr * 12;
    dto.activeSubscriptions = active;
    dto.trialingSubscriptions = trialing;
    dto.pastDueSubscriptions = pastDue;
    dto.canceledSubscriptions = canceled;
    dto.canceledLast30Days = canceledLast30Days;
    dto.churnRate = churnRate;
    return dto;
  }
}
