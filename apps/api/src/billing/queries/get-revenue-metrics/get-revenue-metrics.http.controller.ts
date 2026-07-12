import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { RevenueMetricsResponseDto } from '../../dtos/revenue-metrics.response.dto';
import { GetRevenueMetricsQuery } from './get-revenue-metrics.query';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('billing')
export class GetRevenueMetricsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('metrics')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Billing' })
  @ApiOperation({ summary: 'Get aggregate revenue metrics (admin)' })
  @ApiResponse({ status: 200, type: RevenueMetricsResponseDto })
  metrics(): Promise<RevenueMetricsResponseDto> {
    return this.queryBus.execute<GetRevenueMetricsQuery, RevenueMetricsResponseDto>(
      new GetRevenueMetricsQuery(),
    );
  }
}
