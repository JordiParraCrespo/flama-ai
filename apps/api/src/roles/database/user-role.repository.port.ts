import type { RoleEntity } from '../domain/role.entity';

/**
 * Port for the user ↔ role assignment join. Kept separate from the role
 * aggregate repository because it manages a link table rather than an
 * aggregate of its own.
 */
export interface UserRoleRepositoryPort {
  findRoleIdsForUser(userId: string): Promise<string[]>;
  findRolesForUser(userId: string): Promise<RoleEntity[]>;
  /** Replace the user's entire set of role assignments. */
  setRolesForUser(userId: string, roleIds: string[]): Promise<void>;
}
