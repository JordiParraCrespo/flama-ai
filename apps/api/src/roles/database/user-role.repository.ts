import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import type { RoleEntity } from '../domain/role.entity';
import { RoleMapper } from '../roles.mapper';
import { RoleOrmEntity } from './role.orm-entity';
import { UserRoleOrmEntity } from './user-role.orm-entity';
import type { UserRoleRepositoryPort } from './user-role.repository.port';

/**
 * TypeORM-backed adapter for the user ↔ role join. Reads resolve to domain
 * `RoleEntity` instances (via `RoleMapper`) so callers — notably the
 * `AbilityFactory` — work in domain terms.
 */
@Injectable()
export class UserRoleRepository implements UserRoleRepositoryPort {
  constructor(
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoleRepository: Repository<UserRoleOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepository: Repository<RoleOrmEntity>,
    private readonly mapper: RoleMapper,
  ) {}

  async findRoleIdsForUser(userId: string): Promise<string[]> {
    const links = await this.userRoleRepository.findBy({ userId });
    return links.map((link) => link.roleId);
  }

  async findRolesForUser(userId: string): Promise<RoleEntity[]> {
    const roleIds = await this.findRoleIdsForUser(userId);
    if (roleIds.length === 0) return [];
    const records = await this.roleRepository.findBy({ id: In(roleIds) });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async setRolesForUser(userId: string, roleIds: string[]): Promise<void> {
    // Replace the full set atomically: drop existing links, insert the new ones.
    const uniqueRoleIds = [...new Set(roleIds)];
    await this.userRoleRepository.manager.transaction(async (manager) => {
      await manager.delete(UserRoleOrmEntity, { userId });
      if (uniqueRoleIds.length > 0) {
        await manager.insert(
          UserRoleOrmEntity,
          uniqueRoleIds.map((roleId) => ({ userId, roleId })),
        );
      }
    });
  }
}
