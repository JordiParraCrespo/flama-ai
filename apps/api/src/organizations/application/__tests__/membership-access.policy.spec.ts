import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipAccessPolicy } from '../membership-access.policy';

describe('MembershipAccessPolicy', () => {
  const roles = { findOneByName: vi.fn() };
  const userRoles = {
    findRoleIdsForUser: vi.fn(),
    setRolesForUser: vi.fn(),
  };
  const access = { revokeFor: vi.fn() };
  let policy: MembershipAccessPolicy;

  beforeEach(() => {
    vi.clearAllMocks();
    roles.findOneByName.mockImplementation(async (name: string) => Some({ id: `${name}-role` }));
    userRoles.findRoleIdsForUser.mockResolvedValue([]);
    userRoles.setRolesForUser.mockResolvedValue(undefined);
    access.revokeFor.mockResolvedValue(undefined);
    policy = new MembershipAccessPolicy(roles as never, userRoles as never, access as never);
  });

  it('grants a plain member the org-scoped `user` role', async () => {
    await policy.grant('u1', 'org1', 'member');
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['user-role'], 'org1');
  });

  /**
   * An organization admin on Better Auth's roster becomes the tenant `owner`,
   * never the global `admin`: that one is `manage all`, and org-scoped it
   * would open every non-tenant route whenever the organization is active.
   */
  it.each(['owner', 'admin', 'member,admin'])(
    'grants the org-scoped `owner` role for the organization role %s',
    async (organizationRole) => {
      await policy.grant('u1', 'org1', organizationRole);
      expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['owner-role'], 'org1');
    },
  );

  it('keeps custom roles scoped to the organization when the membership role changes', async () => {
    // Scoped reads include the global assignments; the global read is those alone.
    userRoles.findRoleIdsForUser.mockImplementation(async (_userId: string, scope: unknown) =>
      scope === null ? ['global-role'] : ['global-role', 'user-role', 'custom-role'],
    );

    await policy.grant('u1', 'org1', 'admin');

    expect(userRoles.setRolesForUser).toHaveBeenCalledWith(
      'u1',
      ['custom-role', 'owner-role'],
      'org1',
    );
  });

  it('fails visibly when a required system role is missing', async () => {
    roles.findOneByName.mockImplementation(async (name: string) =>
      name === 'user' ? None : Some({ id: `${name}-role` }),
    );

    await expect(policy.grant('u1', 'org1', 'member')).rejects.toThrow(
      'Required system role "user" is missing',
    );
    expect(userRoles.setRolesForUser).not.toHaveBeenCalled();
  });

  it('revokes what the organization gave through the access repository', async () => {
    await policy.revoke('u1', 'org1');
    expect(access.revokeFor).toHaveBeenCalledWith('u1', 'org1');
  });
});
