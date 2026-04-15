import type { UpdateUserDto } from "@flama/shared";
import { inject, injectable } from "inversify";
import { TOKENS } from "../../di/tokens";
import type { UserEntity } from "./user.entity";
import type { UsersRepository } from "./users.repository";

@injectable()
export class UsersService {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    search?: string,
    role?: "admin" | "user",
  ) {
    return this.usersRepository.findAll(page, limit, search, role);
  }

  async me(): Promise<UserEntity> {
    return this.usersRepository.me();
  }

  async findById(id: string): Promise<UserEntity> {
    return this.usersRepository.findById(id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    return this.usersRepository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    return this.usersRepository.delete(id);
  }
}
