import type {
  AuthProvider,
  CreateUserDto,
  PaginationParams,
  UpdateUserDto,
} from "@flama/shared";
import { PAGINATION } from "@flama/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async findAll(params?: PaginationParams) {
    const page = params?.page || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      params?.limit || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
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
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async create(dto: CreateUserDto & { password?: string }): Promise<User> {
    const user = this.usersRepository.create(dto);
    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null
  ): Promise<void> {
    await this.usersRepository.update(id, { refreshToken });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ resetPasswordToken: token });
  }

  async findOrCreateOAuthUser(profile: {
    email: string;
    firstName: string;
    lastName: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<User> {
    let user = await this.findByEmail(profile.email);
    if (!user) {
      user = this.usersRepository.create({
        ...profile,
        isActive: true,
        emailVerifiedAt: new Date(),
      });
      return this.usersRepository.save(user);
    }
    return user;
  }
}
