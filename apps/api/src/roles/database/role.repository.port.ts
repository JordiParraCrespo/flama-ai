import type { Paginated, RepositoryPort } from '@flama/backend-ddd';
import type { Option } from 'oxide.ts';
import type { RoleEntity } from '../domain/role.entity';

export interface FindRolesParams {
  page: number;
  limit: number;
  search?: string;
}

/**
 * Port for persisting and querying the role aggregate. Implemented by the
 * TypeORM adapter in `role.repository.ts`.
 */
export interface RoleRepositoryPort extends RepositoryPort<RoleEntity> {
  findOneByName(name: string): Promise<Option<RoleEntity>>;
  findByIds(ids: string[]): Promise<RoleEntity[]>;
  findRoles(params: FindRolesParams): Promise<Paginated<RoleEntity>>;
}
