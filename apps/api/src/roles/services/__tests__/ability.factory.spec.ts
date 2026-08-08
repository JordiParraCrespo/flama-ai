import { subject } from '@flama/shared';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../database/user-role.repository.port';
import { RoleEntity } from '../../domain/role.entity';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { AbilityFactory } from '../ability.factory';
import { AbilityContributorRegistry } from '../ability-contributor';

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
  let contributorRegistry: AbilityContributorRegistry;

  beforeEach(() => {
    userRoleRepo = {
      findRoleIdsForUser: vi.fn(),
      findRolesForUser: vi.fn().mockResolvedValue([]),
      setRolesForUser: vi.fn(),
    };
    roleRepo = { findOneByName: vi.fn().mockResolvedValue(None) };
    contributorRegistry = new AbilityContributorRegistry();
    factory = new AbilityFactory(userRoleRepo, roleRepo as RoleRepositoryPort, contributorRegistry);
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

  it('unions the Better Auth `user.role` column with the assigned join roles', async () => {
    // Simulates an admin-plugin `set-role` promotion: the user keeps their
    // default `user` join row but `user.role` is now `admin`, so CASL must also
    // grant the `admin` role's permissions.
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([
      makeRole('user', [Permission.fromDefinition({ action: 'read', subject: 'User' })]),
    ]);
    vi.mocked(roleRepo.findOneByName).mockResolvedValue(
      Some(
        makeRole('admin', [Permission.fromDefinition({ action: 'manage', subject: 'all' })], true),
      ),
    );

    const ability = await factory.createForUser({
      id: 'user-1',
      role: 'admin',
    });

    expect(ability.can('read', 'User')).toBe(true); // from the join role
    expect(ability.can('delete', 'Role')).toBe(true); // from user.role = admin
  });

  it('falls back to the seeded system-role permissions when the role is not in the DB', async () => {
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([]);
    vi.mocked(roleRepo.findOneByName).mockResolvedValue(None);

    const ability = await factory.createForUser({ id: 'user-1', role: 'user' });

    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(false);
  });
  describe('ability contributors', () => {
    it('applies a contributed `cannot` rule on top of the role-granted access', async () => {
      vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([
        makeRole('editor', [Permission.fromDefinition({ action: 'manage', subject: 'Domain' })]),
      ]);
      contributorRegistry.register({
        contribute: vi.fn().mockResolvedValue([
          {
            action: 'manage',
            subject: 'Domain',
            conditions: { id: { $nin: ['allowed'] } },
            inverted: true,
          },
        ]),
      });

      const ability = await factory.createForUser({ id: 'user-1' });

      expect(ability.can('read', subject('Domain', { id: 'allowed' }))).toBe(true);
      expect(ability.can('read', subject('Domain', { id: 'other' }))).toBe(false);
    });

    it('drops a permissive contributed rule — a contributor may only narrow', async () => {
      vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([]);
      contributorRegistry.register({
        contribute: vi
          .fn()
          .mockResolvedValue([{ action: 'manage', subject: 'all', inverted: false }]),
      });

      const ability = await factory.createForUser({ id: 'user-1' });

      expect(ability.can('delete', 'User')).toBe(false);
    });

    it('passes the ability scope through to each contributor', async () => {
      const contribute = vi.fn().mockResolvedValue([]);
      contributorRegistry.register({ contribute });

      await factory.createForUser({ id: 'user-1' }, { activeOrganizationId: 'org-9' });

      expect(contribute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        expect.objectContaining({ activeOrganizationId: 'org-9' }),
      );
    });
  });
});
