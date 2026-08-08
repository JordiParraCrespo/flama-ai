import type { AppAbility } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import type { LeadOrmEntity } from './database/lead.orm-entity';
import { LeadResponseDto } from './dtos/lead.response.dto';

/** Fields a caller may hold `read Lead` without being able to see. */
const FIELD_LEVEL = ['value', 'notes'] as const;

@Injectable()
export class LeadMapper {
  /**
   * Persistence → response, honouring **field-level** permissions.
   *
   * The route guard answers "may you read leads"; it cannot answer "may you
   * read their value". Passing the ability here is what makes a
   * `{ action: 'read', subject: 'Lead', fields: ['value'], inverted: true }`
   * rule actually redact the column rather than merely describe an intention.
   */
  toResponse(record: LeadOrmEntity, ability?: AppAbility): LeadResponseDto {
    const dto = new LeadResponseDto();
    dto.id = record.id;
    dto.organizationId = record.organizationId;
    dto.teamId = record.teamId;
    dto.ownerId = record.ownerId;
    dto.name = record.name;
    dto.email = record.email;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;

    // `value` is a bigint, which the driver returns as a string.
    dto.value = Number(record.value ?? 0);
    dto.notes = record.notes;

    if (ability) {
      for (const field of FIELD_LEVEL) {
        if (!ability.can('read', 'Lead', field)) {
          if (field === 'value') dto.value = 0;
          if (field === 'notes') dto.notes = null;
        }
      }
    }

    return dto;
  }
}
