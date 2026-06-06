import { AppError } from "@flama/backend-core";
import type { PaginationParams } from "@flama/shared";
import { PAGINATION } from "@flama/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { UserErrors } from "../errors/user.errors";
import { User } from "../user.entity";

/**
 * Read/update access to the Better Auth `user` table for the `/users`
 * endpoints. User creation, credentials and OAuth links are owned by Better
 * Auth (see `auth.ts`).
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(params?: PaginationParams) {
    const page = params?.page || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      params?.limit || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const [data, total] = await this.usersRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new AppError(UserErrors.NOT_FOUND);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async update(id: string, dto: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }
}
