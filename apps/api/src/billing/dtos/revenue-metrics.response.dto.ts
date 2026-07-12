import { ApiProperty } from '@nestjs/swagger';

export class RevenueMetricsResponseDto {
  @ApiProperty({
    description: 'Currency the monetary figures are reported in (minor units).',
  })
  currency!: string;

  @ApiProperty({
    description: 'Monthly Recurring Revenue in minor units (yearly plans normalized to /12).',
  })
  mrr!: number;

  @ApiProperty({
    description: 'Annual Recurring Revenue in minor units (mrr * 12).',
  })
  arr!: number;

  @ApiProperty()
  activeSubscriptions!: number;

  @ApiProperty()
  trialingSubscriptions!: number;

  @ApiProperty()
  pastDueSubscriptions!: number;

  @ApiProperty()
  canceledSubscriptions!: number;

  @ApiProperty({
    description: 'Subscriptions canceled within the trailing 30 days.',
  })
  canceledLast30Days!: number;

  @ApiProperty({
    description:
      'Approximate monthly churn: canceledLast30Days / (active + canceledLast30Days), in [0, 1].',
  })
  churnRate!: number;
}
