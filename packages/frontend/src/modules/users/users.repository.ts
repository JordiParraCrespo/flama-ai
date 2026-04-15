import type { UsersClient } from "@flama/api-client/users";
import type { AuthProvider, Role, UpdateUserDto } from "@flama/shared";
import { inject, injectable } from "inversify";
import { TOKENS } from "../../di/tokens";
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
  constructor(
    @inject(TOKENS.UsersClient) private readonly usersClient: UsersClient,
  ) {}

  async me(): Promise<UserEntity> {
    const data = await this.usersClient.me();
    if (!data) throw new AppError(UsersErrors.FETCH_FAILED);
    return toEntity(data);
  }

  async findById(id: string): Promise<UserEntity> {
    const data = await this.usersClient.findOne(id);
    if (!data) throw new AppError(UsersErrors.FETCH_FAILED);
    return toEntity(data);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const data = await this.usersClient.update(id, dto);
    if (!data) throw new AppError(UsersErrors.UPDATE_FAILED);
    return toEntity(data);
  }

  async delete(id: string): Promise<void> {
    await this.usersClient.remove(id);
  }
}
