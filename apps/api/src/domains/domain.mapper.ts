import type { Mapper } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { DomainOrmEntity } from './database/domain.orm-entity';
import { DomainEntity } from './domain/domain.entity';
import { Hostname } from './domain/value-objects/hostname.value-object';
import { DomainResponseDto } from './dtos/domain.response.dto';

/** Maps the domain aggregate between its domain, persistence and response shapes. */
@Injectable()
export class DomainMapper implements Mapper<DomainEntity, DomainOrmEntity, DomainResponseDto> {
  toPersistence(entity: DomainEntity): DomainOrmEntity {
    const record = new DomainOrmEntity();
    record.id = entity.id;
    record.organizationId = entity.organizationId;
    record.hostname = entity.hostname;
    record.protocol = entity.protocol;
    record.status = entity.status;
    record.ownerId = entity.ownerId;
    record.importSearchConsole = entity.importSearchConsole;
    record.runInitialCrawl = entity.runInitialCrawl;
    record.verifiedAt = entity.verifiedAt;
    record.lastCrawledAt = entity.lastCrawledAt;
    return record;
  }

  toDomain(record: DomainOrmEntity): DomainEntity {
    return DomainEntity.create({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        organizationId: record.organizationId,
        hostname: Hostname.of(record.hostname),
        protocol: record.protocol,
        status: record.status,
        ownerId: record.ownerId,
        importSearchConsole: record.importSearchConsole,
        runInitialCrawl: record.runInitialCrawl,
        verifiedAt: record.verifiedAt,
        lastCrawledAt: record.lastCrawledAt,
      },
    });
  }

  toResponse(entity: DomainEntity): DomainResponseDto {
    const dto = new DomainResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.hostname = entity.hostname;
    dto.protocol = entity.protocol;
    dto.status = entity.status;
    dto.ownerId = entity.ownerId;
    dto.url = entity.url;
    dto.importSearchConsole = entity.importSearchConsole;
    dto.runInitialCrawl = entity.runInitialCrawl;
    dto.verifiedAt = entity.verifiedAt;
    dto.lastCrawledAt = entity.lastCrawledAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
