import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../users/dtos/paginated-users.response.dto';
import { DomainResponseDto } from './domain.response.dto';

export class PaginatedDomainsResponseDto {
  @ApiProperty({ type: [DomainResponseDto] })
  data!: DomainResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
