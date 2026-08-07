import type { DomainProtocol, DomainStatus } from '@flama/shared';
import { DOMAIN_PROTOCOLS, DOMAIN_STATUSES } from '@flama/shared';
import { ApiProperty } from '@nestjs/swagger';

export class DomainResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ example: 'blog.example.com' })
  hostname!: string;

  @ApiProperty({ enum: DOMAIN_PROTOCOLS })
  protocol!: DomainProtocol;

  @ApiProperty({ enum: DOMAIN_STATUSES })
  status!: DomainStatus;

  @ApiProperty({ nullable: true, type: String })
  ownerId!: string | null;

  @ApiProperty({
    example: 'https://blog.example.com',
    description: 'Canonical URL',
  })
  url!: string;

  @ApiProperty()
  importSearchConsole!: boolean;

  @ApiProperty()
  runInitialCrawl!: boolean;

  @ApiProperty({ nullable: true, type: Date })
  verifiedAt!: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  lastCrawledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
