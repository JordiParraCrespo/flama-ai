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
  const members = { findAccounts: vi.fn() };
  let policy: MembershipAccessPolicy;

  const entry = (role: string) => ({ userId: 'u1', organizationId: 'org1', role });

  beforeEach(() => {
    vi.clearAllMocks();
    roles.findOneByName.mockImplementation(async (name: string) => Some({ id: `${name}-role` }));
    userRoles.findRoleIdsForUser.mockResolvedValue([]);
    userRoles.setRolesForUser.mockResolvedValue(undefined);
    access.revokeFor.mockResolvedValue(undefined);
    members.findAccounts.mockResolvedValue([]);
    policy = new MembershipAccessPolicy(
      roles as never,
      userRoles as never,
      access as never,
      members as never,
    );
  });

  describe('grant', () => {
    it('grants a plain member the org-scoped `user` role', async () => {
      await policy.grant(entry('member'));
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
        await policy.grant(entry(organizationRole));
        expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['owner-role'], 'org1');
      },
    );

    it('keeps custom roles scoped to the organization when the membership role changes', async () => {
      // Scoped reads include the global assignments; the global read is those alone.
      userRoles.findRoleIdsForUser.mockImplementation(async (_userId: string, scope: unknown) =>
        scope === null ? ['global-role'] : ['global-role', 'user-role', 'custom-role'],
      );

      await policy.grant(entry('admin'));

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

      await expect(policy.grant(entry('member'))).rejects.toThrow(
        'Required system role "user" is missing',
      );
      expect(userRoles.setRolesForUser).not.toHaveBeenCalled();
    });
  });

  describe('admit', () => {
    it('makes the roster write, grants its role, and answers the entry', async () => {
      const undo = vi.fn();
      const admitted = await policy.admit(async () => ({ ...entry('member'), id: 'm1' }), undo);

      expect(admitted.id).toBe('m1');
      expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['user-role'], 'org1');
      expect(undo).not.toHaveBeenCalled();
    });

    /**
     * The failure this exists for: Better Auth has committed the membership and
     * the role that opens the organization was not written, which leaves a
     * member who is answered 403 on every screen of it.
     */
    it('undoes the roster write when the role cannot be granted, and raises why', async () => {
      const failure = new Error('role store unavailable');
      userRoles.setRolesForUser.mockRejectedValueOnce(failure);
      const undo = vi.fn().mockResolvedValue(undefined);

      await expect(policy.admit(async () => entry('member'), undo)).rejects.toBe(failure);
      expect(undo).toHaveBeenCalledWith(entry('member'));
    });

    it('still raises the original failure when the undo fails too', async () => {
      const failure = new Error('role store unavailable');
      userRoles.setRolesForUser.mockRejectedValueOnce(failure);
      const undo = vi.fn().mockRejectedValue(new Error('undo failed too'));

      await expect(policy.admit(async () => entry('member'), undo)).rejects.toBe(failure);
    });

    it('neither grants nor undoes when the roster write itself fails', async () => {
      const failure = new Error('Better Auth refused');
      const undo = vi.fn();

      await expect(policy.admit(() => Promise.reject(failure), undo)).rejects.toBe(failure);
      expect(userRoles.setRolesForUser).not.toHaveBeenCalled();
      expect(undo).not.toHaveBeenCalled();
    });
  });

  it('releases a membership: revokes what it gave and answers it with its account', async () => {
    members.findAccounts.mockResolvedValue([{ id: 'u1', email: 'member@x.com' }]);
    const member = {
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'member',
      createdAt: new Date(),
      user: null,
    };

    const released = await policy.release(member);

    expect(access.revokeFor).toHaveBeenCalledWith('u1', 'org1');
    expect(released).toMatchObject({ id: 'm1', user: { email: 'member@x.com' } });
  });
});
