import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../database/user-role.repository.port';
import { RoleEntity } from '../../domain/role.entity';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { AbilityFactory } from '../ability.factory';

function makeRole(name: string, permissions: Permission[], isSystem = false): RoleEntity {
  return RoleEntity.create({
    id: `role-${name}`,
    props: { name, description: null, isSystem, permissions },
  });
}

describe('AbilityFactory', () => {
  let factory: AbilityFactory;
  let userRoleRepo: UserRoleRepositoryPort;
  let roleRepo: Pick<RoleRepositoryPort, 'findOneByName'>;

  beforeEach(() => {
    userRoleRepo = {
      findRoleIdsForUser: vi.fn(),
      findRolesForUser: vi.fn().mockResolvedValue([]),
      setRolesForUser: vi.fn(),
    };
    roleRepo = { findOneByName: vi.fn().mockResolvedValue(None) };
    factory = new AbilityFactory(userRoleRepo, roleRepo as RoleRepositoryPort);
  });

  it('builds the ability from the union of the user’s assigned roles', async () => {
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([
      makeRole('reader', [Permission.fromDefinition({ action: 'read', subject: 'User' })]),
      makeRole('writer', [Permission.fromDefinition({ action: 'create', subject: 'Article' })]),
    ]);

    const ability = await factory.createForUser({ id: 'user-1' });

    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('create', 'Article')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(false);
  });

  it('falls back to the legacy role name via the DB role when no assignments exist', async () => {
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([]);
    vi.mocked(roleRepo.findOneByName).mockResolvedValue(
      Some(
        makeRole('admin', [Permission.fromDefinition({ action: 'manage', subject: 'all' })], true),
      ),
    );

    const ability = await factory.createForUser({
      id: 'user-1',
      role: 'admin',
    });

    expect(ability.can('delete', 'Role')).toBe(true);
    expect(roleRepo.findOneByName).toHaveBeenCalledWith('admin');
  });

  it('falls back to the seeded system-role permissions when the role is not in the DB', async () => {
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([]);
    vi.mocked(roleRepo.findOneByName).mockResolvedValue(None);

    const ability = await factory.createForUser({ id: 'user-1', role: 'user' });

    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(false);
  });
});
