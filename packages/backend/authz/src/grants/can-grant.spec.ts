import { defineAbilitiesFromPermissions } from '@flama/shared';
import { describe, expect, it } from 'vitest';
import type { AccessScope } from '../scope/access-scope';
import { canGrant, ungrantablePermissions } from './can-grant';
import { canGrantScope } from './can-grant-scope';

const tenantOwned = { keys: { organization: 'organizationId', id: 'id' } };
const personOwned = { keys: { owner: 'ownerId', id: 'id' } };
const grantScope = (
  actor: Parameters<typeof canGrantScope>[0],
  grant: Parameters<typeof canGrantScope>[1],
  resource: Parameters<typeof canGrantScope>[2] = tenantOwned,
) => canGrantScope(actor, grant, resource);

const abilityOf = (rules: Parameters<typeof defineAbilitiesFromPermissions>[0]) =>
  defineAbilitiesFromPermissions(rules);

describe('canGrant', () => {
  it('lets an actor grant what they already hold', () => {
    const actor = abilityOf([{ action: 'read', subject: 'Lead' }]);
    expect(canGrant(actor, [{ action: 'read', subject: 'Lead' }])).toBe(true);
  });

  it('blocks the escalation to `manage all`', () => {
    // The whole point: someone who can edit roles must not be able to write
    // themselves a role that outranks them.
    const actor = abilityOf([{ action: 'manage', subject: 'Role' }]);
    const requested = [{ action: 'manage', subject: 'all' }];

    expect(canGrant(actor, requested)).toBe(false);
    expect(ungrantablePermissions(actor, requested)).toEqual(requested);
  });

  it('lets a full-access actor grant anything', () => {
    const actor = abilityOf([{ action: 'manage', subject: 'all' }]);
    expect(canGrant(actor, [{ action: 'export', subject: 'Lead' }])).toBe(true);
  });

  it('always allows a deny — narrowing reach cannot escalate', () => {
    const actor = abilityOf([{ action: 'read', subject: 'Lead' }]);
    expect(canGrant(actor, [{ action: 'export', subject: 'Lead', inverted: true }])).toBe(true);
  });

  it('requires the actor to hold every field they grant', () => {
    const actor = abilityOf([
      { action: 'read', subject: 'Lead' },
      { action: 'read', subject: 'Lead', fields: ['value'], inverted: true },
    ]);

    expect(canGrant(actor, [{ action: 'read', subject: 'Lead', fields: ['notes'] }])).toBe(true);
    expect(canGrant(actor, [{ action: 'read', subject: 'Lead', fields: ['value'] }])).toBe(false);
  });
});

function scope(overrides: Partial<AccessScope> = {}): AccessScope {
  return {
    userId: 'user-1',
    organizationId: 'org-1',
    teamIds: [],
    grants: new Map(),
    bypass: false,
    ...overrides,
  };
}

describe('canGrantScope', () => {
  it('allows granting a row the actor holds', () => {
    const actor = scope({ grants: new Map([['Lead', new Set(['lead-1'])]]) });
    expect(
      grantScope(actor, {
        organizationId: 'org-1',
        resourceType: 'Lead',
        resourceId: 'lead-1',
      }),
    ).toBe(true);
  });

  it('blocks granting a row the actor does not hold', () => {
    const actor = scope({ grants: new Map([['Lead', new Set(['lead-1'])]]) });
    expect(
      grantScope(actor, {
        organizationId: 'org-1',
        resourceType: 'Lead',
        resourceId: 'lead-2',
      }),
    ).toBe(false);
  });

  it('only lets an `all` holder mint an `all` grant', () => {
    const partial = scope({ grants: new Map([['Lead', new Set(['lead-1'])]]) });
    const full = scope({ grants: new Map([['Lead', 'all']]) });
    const request = {
      organizationId: 'org-1',
      resourceType: 'Lead',
      resourceId: null,
    };

    expect(grantScope(partial, request)).toBe(false);
    expect(grantScope(full, request)).toBe(true);
  });

  it('never crosses a tenant boundary', () => {
    const actor = scope({ grants: new Map([['Lead', 'all']]) });
    expect(
      grantScope(actor, {
        organizationId: 'org-2',
        resourceType: 'Lead',
        resourceId: null,
      }),
    ).toBe(false);
  });

  it('lets the platform tier through', () => {
    expect(
      grantScope(scope({ bypass: true }), {
        organizationId: 'org-2',
        resourceType: 'Lead',
        resourceId: null,
      }),
    ).toBe(true);
  });

  describe("a person's own rows (no organization key)", () => {
    const grant = { organizationId: 'org-1', resourceType: 'Host', resourceId: 'host-1' };
    const every = { ...grant, resourceId: null };

    it('are not passed on by the platform tier or by an "all" holder', () => {
      expect(grantScope(scope({ bypass: true }), grant, personOwned)).toBe(false);
      const all = scope({ grants: new Map([['Host', 'all']]) });
      expect(grantScope(all, grant, personOwned)).toBe(false);
      expect(grantScope(all, every, personOwned)).toBe(false);
    });

    it('are passed on by someone already granted that row, by id', () => {
      const holder = scope({ grants: new Map([['Host', new Set(['host-1'])]]) });
      expect(grantScope(holder, grant, personOwned)).toBe(true);
    });

    it('hold a type the registry does not know to the same rule', () => {
      expect(canGrantScope(scope({ bypass: true }), grant, undefined)).toBe(false);
    });
  });
});
