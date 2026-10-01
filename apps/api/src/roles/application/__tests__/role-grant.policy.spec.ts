import { AppError } from '@flama/backend-core';
import { defineAbilitiesFromPermissions, type PermissionDefinition } from '@flama/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AbilityFactory } from '../ability.factory';
import { RoleGrantPolicy } from '../role-grant.policy';

function policyFor(actorPermissions: PermissionDefinition[]): RoleGrantPolicy {
  const abilityFactory = {
    createForUser: vi.fn().mockResolvedValue(defineAbilitiesFromPermissions(actorPermissions)),
  } as unknown as AbilityFactory;
  return new RoleGrantPolicy(abilityFactory);
}

const ACTOR = { id: 'admin-1', activeOrganizationId: 'org-1' };

describe('RoleGrantPolicy', () => {
  it('allows granting what the actor already holds', async () => {
    const policy = policyFor([{ action: 'read', subject: 'Lead' }]);

    await expect(
      policy.assertGrantable(ACTOR, [{ action: 'read', subject: 'Lead' }]),
    ).resolves.toBeUndefined();
  });

  it('blocks a role editor from writing themselves `manage all`', async () => {
    // Without this, `update Role` is effectively `manage all`: compose the
    // role, assign it to yourself, done.
    const policy = policyFor([{ action: 'manage', subject: 'Role' }]);

    await expect(
      policy.assertGrantable(ACTOR, [{ action: 'manage', subject: 'all' }]),
    ).rejects.toThrow(AppError);
  });

  it('names what the actor is short of', async () => {
    const policy = policyFor([{ action: 'read', subject: 'Lead' }]);

    // The catalog message titles the problem and stays stable; what this
    // caller is short of belongs in `detail`.
    const error = await policy
      .assertGrantable(ACTOR, [{ action: 'export', subject: 'Lead' }])
      .catch((thrown: AppError) => thrown);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).detail).toContain('export Lead');
  });

  it('lets a full-access actor grant anything', async () => {
    const policy = policyFor([{ action: 'manage', subject: 'all' }]);

    await expect(
      policy.assertGrantable(ACTOR, [
        { action: 'export', subject: 'Lead' },
        { action: 'manage', subject: 'all' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('trusts an internal caller with no actor', async () => {
    // Seeds and migration backfills are the code that defines the system roles;
    // there is no ability to check them against.
    const policy = policyFor([]);

    await expect(
      policy.assertGrantable(undefined, [{ action: 'manage', subject: 'all' }]),
    ).resolves.toBeUndefined();
  });

  it('skips the lookup entirely for an empty permission set', async () => {
    const abilityFactory = {
      createForUser: vi.fn(),
    } as unknown as AbilityFactory;
    const policy = new RoleGrantPolicy(abilityFactory);

    await policy.assertGrantable(ACTOR, []);

    expect(abilityFactory.createForUser).not.toHaveBeenCalled();
  });

  describe('assertCanCreateGlobal', () => {
    it('allows an actor holding manage all, asked in the platform scope', async () => {
      const createForUser = vi
        .fn()
        .mockResolvedValue(defineAbilitiesFromPermissions([{ action: 'manage', subject: 'all' }]));
      const policy = new RoleGrantPolicy({ createForUser } as unknown as AbilityFactory);

      await expect(policy.assertCanCreateGlobal(ACTOR)).resolves.toBeUndefined();
      expect(createForUser).toHaveBeenCalledWith(
        { id: ACTOR.id, role: undefined },
        { activeOrganizationId: null },
      );
    });

    it("refuses a tenant owner's conditioned manage Role", async () => {
      const policy = policyFor([
        { action: 'manage', subject: 'Role', conditions: { organizationId: 'org-1' } },
      ]);

      await expect(policy.assertCanCreateGlobal(ACTOR)).rejects.toMatchObject({
        code: 'ROLE_005',
      });
    });

    it('answers ROLE_008 to an actor with no role rights in the platform scope', async () => {
      const policy = policyFor([{ action: 'read', subject: 'Lead' }]);

      await expect(policy.assertCanCreateGlobal(ACTOR)).rejects.toMatchObject({
        code: 'ROLE_008',
      });
    });

    it('trusts an internal caller with no actor', async () => {
      await expect(policyFor([]).assertCanCreateGlobal(undefined)).resolves.toBeUndefined();
    });
  });
});
