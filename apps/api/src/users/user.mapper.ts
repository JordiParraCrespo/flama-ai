import type { Mapper } from '@flama/backend-core';
import type { AuthProvider, Role } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { UserResponseDto } from './dtos/user-response.dto';
import { User } from './user.entity';

export interface UserServiceModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  provider: AuthProvider;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserMapper implements Mapper<User, UserServiceModel, UserResponseDto> {
  toRepository(data: Partial<User>): User {
    const entity = new User();
    if (data.email) entity.email = data.email;
    if (data.firstName) entity.firstName = data.firstName;
    if (data.lastName) entity.lastName = data.lastName;
    if (data.password) entity.password = data.password;
    if (data.role) entity.role = data.role;
    if (data.provider) entity.provider = data.provider;
    if (data.providerId) entity.providerId = data.providerId;
    if (data.isActive !== undefined) entity.isActive = data.isActive;
    if (data.emailVerifiedAt) entity.emailVerifiedAt = data.emailVerifiedAt;
    return entity;
  }

  toService(entity: User): UserServiceModel {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      provider: entity.provider,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toController(model: UserServiceModel): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = model.id;
    dto.email = model.email;
    dto.firstName = model.firstName;
    dto.lastName = model.lastName;
    dto.role = model.role;
    dto.isActive = model.isActive;
    dto.createdAt = model.createdAt;
    dto.updatedAt = model.updatedAt;
    return dto;
  }
}
