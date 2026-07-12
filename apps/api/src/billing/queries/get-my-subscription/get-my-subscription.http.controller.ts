import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { SubscriptionEntity } from '../../domain/subscription.entity';
import { SubscriptionResponseDto } from '../../dtos/subscription.response.dto';
import { SubscriptionMapper } from '../../subscription.mapper';
import { GetMySubscriptionQuery } from './get-my-subscription.query';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('billing')
export class GetMySubscriptionHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: SubscriptionMapper,
  ) {}

  @Get('subscription')
  @Version('1')
  @ApiOperation({
    summary: "Get the current user's subscription (null if none)",
  })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getSubscription(
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.queryBus.execute<
      GetMySubscriptionQuery,
      SubscriptionEntity | null
    >(new GetMySubscriptionQuery(userId));
    return subscription ? this.mapper.toResponse(subscription) : null;
  }
}
