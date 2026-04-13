import type { PaginatedResponse, PaginationParams } from '@flama/shared';
import type { UserEntity } from '../entities/user.entity';

export interface IUserRepository {
  findAll(params: PaginationParams): Promise<PaginatedResponse<UserEntity>>;
  findById(id: string): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<void>;
}
