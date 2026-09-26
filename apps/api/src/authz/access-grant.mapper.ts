import type { Mapper } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { AccessGrantOrmEntity } from './database/access-grant.orm-entity';
import { AccessGrantEntity } from './domain/access-grant.entity';
import { AccessGrantResponseDto } from './dtos/access-grant.response.dto';

/** Maps the access-grant aggregate between its three shapes. */
@Injectable()
export class AccessGrantMapper
  implements Mapper<AccessGrantEntity, AccessGrantOrmEntity, AccessGrantResponseDto>
{
  toPersistence(entity: AccessGrantEntity): AccessGrantOrmEntity {
    const record = new AccessGrantOrmEntity();
    record.id = entity.id;
    record.organizationId = entity.organizationId;
    record.principalType = entity.principalType;
    record.principalId = entity.principalId;
    record.resourceType = entity.resourceType;
    record.resourceId = entity.resourceId;
    record.grantedBy = entity.grantedBy;
    record.expiresAt = entity.expiresAt;
    return record;
  }

  toDomain(record: AccessGrantOrmEntity): AccessGrantEntity {
    return AccessGrantEntity.create({
      id: record.id,
      createdAt: record.createdAt,
      // The table is append-only, so there is no separate updated timestamp.
      updatedAt: record.createdAt,
      props: {
        organizationId: record.organizationId,
        principalType: record.principalType,
        principalId: record.principalId,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        grantedBy: record.grantedBy,
        expiresAt: record.expiresAt,
      },
    });
  }

  toResponse(entity: AccessGrantEntity): AccessGrantResponseDto {
    const dto = new AccessGrantResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.principalType = entity.principalType;
    dto.principalId = entity.principalId;
    dto.resourceType = entity.resourceType;
    dto.resourceId = entity.resourceId;
    dto.grantedBy = entity.grantedBy;
    dto.expiresAt = entity.expiresAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
