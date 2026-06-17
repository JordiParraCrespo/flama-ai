import type { Mapper } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { UserOrmEntity } from './database/user.orm-entity';
import { UserEntity } from './domain/user.entity';
import { Email } from './domain/value-objects/email.value-object';
import { UserResponseDto } from './dtos/user.response.dto';

/**
 * Maps the user aggregate between its domain, persistence and response shapes.
 *
 * Note: `toPersistence` only writes the profile columns the application owns.
 * `name` and `image` are managed by Better Auth and deliberately left untouched
 * so a profile update never clobbers them.
 */
@Injectable()
export class UserMapper implements Mapper<UserEntity, UserOrmEntity, UserResponseDto> {
  toPersistence(entity: UserEntity): UserOrmEntity {
    const record = new UserOrmEntity();
    record.id = entity.id;
    record.email = entity.email;
    record.firstName = entity.firstName;
    record.lastName = entity.lastName;
    record.role = entity.role;
    record.isActive = entity.isActive;
    record.emailVerified = entity.emailVerified;
    return record;
  }

  toDomain(record: UserOrmEntity): UserEntity {
    return UserEntity.create({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        email: new Email({ value: record.email }),
        firstName: record.firstName,
        lastName: record.lastName,
        role: record.role,
        isActive: record.isActive,
        emailVerified: record.emailVerified,
      },
    });
  }

  toResponse(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.firstName = entity.firstName;
    dto.lastName = entity.lastName;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    dto.emailVerified = entity.emailVerified;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
