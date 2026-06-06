import type { Mapper } from "@flama/backend-core";
import type { Role } from "@flama/shared";
import { Injectable } from "@nestjs/common";
import { UserResponseDto } from "./dtos/user-response.dto";
import { User } from "./user.entity";

export interface UserServiceModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserMapper implements Mapper<
  User,
  UserServiceModel,
  UserResponseDto
> {
  toRepository(data: Partial<User>): User {
    const entity = new User();
    if (data.email) entity.email = data.email;
    if (data.firstName) entity.firstName = data.firstName;
    if (data.lastName) entity.lastName = data.lastName;
    if (data.role) entity.role = data.role;
    if (data.isActive !== undefined) entity.isActive = data.isActive;
    return entity;
  }

  toService(entity: User): UserServiceModel {
    return {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      isActive: entity.isActive,
      emailVerified: entity.emailVerified,
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
    dto.emailVerified = model.emailVerified;
    dto.createdAt = model.createdAt;
    dto.updatedAt = model.updatedAt;
    return dto;
  }
}
