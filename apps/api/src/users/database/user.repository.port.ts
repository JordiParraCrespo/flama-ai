import type { Paginated, RepositoryPort } from '@flama/backend-ddd';
import type { Role } from '@flama/shared';
import type { Option } from 'oxide.ts';
import type { UserEntity } from '../domain/user.entity';

export interface FindUsersParams {
  page: number;
  limit: number;
  role?: Role;
  search?: string;
}

/**
 * Port for persisting and querying the user aggregate. Implemented by the
 * TypeORM adapter in `user.repository.ts`.
 */
export interface UserRepositoryPort extends RepositoryPort<UserEntity> {
  findOneByEmail(email: string): Promise<Option<UserEntity>>;
  findUsers(params: FindUsersParams): Promise<Paginated<UserEntity>>;
}
