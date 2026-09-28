import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ABILITY_MEMO, type AbilityRequest } from '../../../auth/application/ability.port';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../database/user-role.repository.port';
import { RoleEntity } from '../../domain/role.entity';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { AbilityFactory } from '../ability.factory';

function makeRole(name: string, permissions: Permission[], isSystem = false): RoleEntity {
  return RoleEntity.create({
    id: `role-${name}`,
    props: {
      name,
      description: null,
      isSystem,
      organizationId: null,
      permissions,
    },
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

  it('unions comma-separated Better Auth platform roles', async () => {
    vi.mocked(roleRepo.findOneByName).mockImplementation(async (name) =>
      name === 'admin'
        ? Some(
            makeRole(
              'admin',
              [Permission.fromDefinition({ action: 'manage', subject: 'all' })],
              true,
            ),
          )
        : None,
    );

    const ability = await factory.createForUser({ id: 'user-1', role: 'user, admin' });

    expect(ability.can('delete', 'Role')).toBe(true);
    expect(roleRepo.findOneByName).toHaveBeenNthCalledWith(1, 'user');
    expect(roleRepo.findOneByName).toHaveBeenNthCalledWith(2, 'admin');
  });

  it('falls back to the seeded system-role permissions when the role is not in the DB', async () => {
    vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([]);
    vi.mocked(roleRepo.findOneByName).mockResolvedValue(None);

    const ability = await factory.createForUser({ id: 'user-1', role: 'user' });

    // The seeded `user` set grants its own API tokens and nothing else, so
    // that rule is what proves the fallback was taken rather than an empty
    // ability being returned. (`Article` used to serve as this marker, until
    // it turned out to be boilerplate with nothing behind it.)
    expect(ability.can('read', 'ApiToken')).toBe(true);
    expect(ability.can('read', 'User')).toBe(false);
    expect(ability.can('delete', 'User')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  describe('forRequest', () => {
    function requestIn(activeOrganizationId: string | null): AbilityRequest {
      return {
        user: { id: 'user-1' },
        session: { activeOrganizationId },
        [ABILITY_MEMO]: new Map(),
      };
    }

    beforeEach(() => {
      // One role per organization, so the built ability says which it was built for.
      vi.mocked(userRoleRepo.findRolesForUser).mockImplementation(async (_userId, orgId) => [
        makeRole(`in-${orgId}`, [
          Permission.fromDefinition({ action: 'read', subject: `Org-${orgId}` }),
        ]),
      ]);
    });

    it('builds once per organization within a request', async () => {
      const request = requestIn('org-a');

      const first = await factory.forRequest(request);
      const second = await factory.forRequest(request, 'org-a');

      expect(second).toBe(first);
      expect(userRoleRepo.findRolesForUser).toHaveBeenCalledTimes(1);
    });

    it("never hands a caller another organization's ability", async () => {
      const request = requestIn('org-a');

      // The guard resolves the route's organization first…
      const routeAbility = await factory.forRequest(request, 'org-b');
      // …and a later caller asking about the session's gets its own.
      const sessionAbility = await factory.forRequest(request);

      expect(routeAbility.can('read', 'Org-org-b')).toBe(true);
      expect(sessionAbility).not.toBe(routeAbility);
      expect(sessionAbility.can('read', 'Org-org-a')).toBe(true);
      expect(sessionAbility.can('read', 'Org-org-b')).toBe(false);
      expect(userRoleRepo.findRolesForUser).toHaveBeenNthCalledWith(1, 'user-1', 'org-b');
      expect(userRoleRepo.findRolesForUser).toHaveBeenNthCalledWith(2, 'user-1', 'org-a');
    });

    it('does not share a memo across requests', async () => {
      await factory.forRequest(requestIn('org-a'));
      await factory.forRequest(requestIn('org-a'));

      expect(userRoleRepo.findRolesForUser).toHaveBeenCalledTimes(2);
    });

    it('interpolates the user-id placeholder from the principal', async () => {
      vi.mocked(userRoleRepo.findRolesForUser).mockResolvedValue([
        makeRole('self', [
          Permission.fromDefinition({
            action: 'read',
            subject: 'User',
            // biome-ignore lint/suspicious/noTemplateCurlyInString: a condition placeholder
            conditions: { id: '${user.id}' },
          }),
        ]),
      ]);

      const ability = await factory.forRequest(requestIn(null));

      expect(ability.rulesFor('read', 'User')[0].conditions).toEqual({ id: 'user-1' });
    });
  });
});
