import { UsersApi } from "@flama/api-client";
import type { AuthProvider, Role, UpdateUserDto } from "@flama/shared";
import { injectable } from "inversify";
import { AppError } from "../core/errors";
import { UserEntity } from "./user.entity";
import { UsersErrors } from "./users.errors";

function toEntity(data: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): UserEntity {
  return new UserEntity(
    data.id,
    data.email,
    data.firstName,
    data.lastName,
    data.role as Role,
    data.provider as AuthProvider,
    data.isActive,
    new Date(data.createdAt),
    new Date(data.updatedAt),
  );
}

@injectable()
export class UsersRepository {
  async findAll(
    page?: number,
    limit?: number,
    search?: string,
    role?: "admin" | "user",
  ): Promise<{
    data: UserEntity[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const result = await UsersApi.findAll(search, role, limit, page);
    if (!result) throw new AppError(UsersErrors.FETCH_LIST_FAILED);
    return {
      data: result.data.map(toEntity),
      meta: result.meta,
    };
  }

  async me(): Promise<UserEntity> {
    const data = await UsersApi.me();
    if (!data) throw new AppError(UsersErrors.FETCH_FAILED);
    return toEntity(data);
  }

  async findById(id: string): Promise<UserEntity> {
    const data = await UsersApi.findOne(id);
    if (!data) throw new AppError(UsersErrors.FETCH_FAILED);
    return toEntity(data);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const data = await UsersApi.update(id, dto);
    if (!data) throw new AppError(UsersErrors.UPDATE_FAILED);
    return toEntity(data);
  }

  async delete(id: string): Promise<void> {
    await UsersApi.remove(id);
  }
}
