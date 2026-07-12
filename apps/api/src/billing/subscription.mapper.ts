import type { Mapper } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { SubscriptionOrmEntity } from './database/subscription.orm-entity';
import { SubscriptionEntity } from './domain/subscription.entity';
import { SubscriptionResponseDto } from './dtos/subscription.response.dto';

/** Maps the subscription aggregate between its domain, persistence and response shapes. */
@Injectable()
export class SubscriptionMapper
  implements Mapper<SubscriptionEntity, SubscriptionOrmEntity, SubscriptionResponseDto>
{
  toPersistence(entity: SubscriptionEntity): SubscriptionOrmEntity {
    const props = entity.getProps();
    const record = new SubscriptionOrmEntity();
    record.id = entity.id;
    record.userId = props.userId;
    record.stripeCustomerId = props.stripeCustomerId;
    record.stripeSubscriptionId = props.stripeSubscriptionId;
    record.stripePriceId = props.stripePriceId;
    record.plan = props.plan;
    record.unitAmount = props.unitAmount;
    record.currency = props.currency;
    record.interval = props.interval;
    record.status = props.status;
    record.currentPeriodEnd = props.currentPeriodEnd;
    record.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    record.canceledAt = props.canceledAt;
    return record;
  }

  toDomain(record: SubscriptionOrmEntity): SubscriptionEntity {
    return SubscriptionEntity.create({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        userId: record.userId,
        stripeCustomerId: record.stripeCustomerId,
        stripeSubscriptionId: record.stripeSubscriptionId,
        stripePriceId: record.stripePriceId,
        plan: record.plan,
        unitAmount: record.unitAmount,
        currency: record.currency,
        interval: record.interval,
        status: record.status,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        canceledAt: record.canceledAt,
      },
    });
  }

  toResponse(entity: SubscriptionEntity): SubscriptionResponseDto {
    const props = entity.getProps();
    const dto = new SubscriptionResponseDto();
    dto.id = entity.id;
    dto.status = props.status;
    dto.priceId = props.stripePriceId;
    dto.plan = props.plan;
    dto.unitAmount = props.unitAmount;
    dto.currency = props.currency;
    dto.interval = props.interval;
    dto.currentPeriodEnd = props.currentPeriodEnd;
    dto.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    dto.canceledAt = props.canceledAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
