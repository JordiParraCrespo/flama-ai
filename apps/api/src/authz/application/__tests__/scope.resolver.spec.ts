import { ResourceRegistry } from '@flama/backend-authz';
import { describe, expect, it, vi } from 'vitest';
import { ScopeResolver } from '../scope.resolver';

/** A resolver over stubbed ports: one team, one role, no grants yet. */
function resolverWith() {
  const teamMembers = { find: vi.fn().mockResolvedValue([{ teamId: 'team-1' }]) };
  const teams = { find: vi.fn().mockResolvedValue([{ id: 'team-1' }]) };
  const grants = { findActiveForPrincipals: vi.fn().mockResolvedValue([]) };
  const userRoles = { findRoleIdsForUser: vi.fn().mockResolvedValue(['role-1']) };
  const registry = new ResourceRegistry();
  registry.register({
    subject: 'Project',
    keys: { organization: 'organizationId', owner: 'ownerUserId' },
    scopes: ['own', 'grant'],
  } as never);
  // A person's own rows: no organization key.
  registry.register({
    subject: 'Host',
    keys: { owner: 'ownerUserId' },
    scopes: ['own', 'grant'],
  } as never);
  const resolver = new ScopeResolver(
    teamMembers as never,
    teams as never,
    grants as never,
    userRoles as never,
    registry,
  );
  return { resolver, grants, userRoles };
}

const input = {
  userId: 'user-1',
  organizationId: 'org-1',
  isPlatformAdmin: false,
  hasFullAccess: false,
};

const grant = (resourceType: string, resourceId: string | null) => ({
  resourceType,
  resourceId,
  isBlanket: () => resourceId === null,
});

describe('ScopeResolver', () => {
  it('reads grants addressed to the caller, their teams and the roles they hold here', async () => {
    const { resolver, grants, userRoles } = resolverWith();

    await resolver.resolve({
      userId: 'user-1',
      organizationId: 'org-1',
      isPlatformAdmin: false,
      hasFullAccess: false,
    });

    expect(userRoles.findRoleIdsForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(grants.findActiveForPrincipals).toHaveBeenCalledWith('org-1', [
      { principalType: 'user', principalId: 'user-1' },
      { principalType: 'team', principalId: 'team-1' },
      { principalType: 'role', principalId: 'role-1' },
    ]);
  });

  it('keeps a named grant on a person-owned type when a blanket one sits beside it', async () => {
    // Regression: the blanket row folded the subject to 'all', which
    // `applyAccessScope` ignores for person-owned rows, so the named row the
    // caller was granted dropped out of every list.
    const { resolver, grants } = resolverWith();
    grants.findActiveForPrincipals.mockResolvedValue([
      grant('Host', null),
      grant('Host', 'host-1'),
    ]);

    const scope = await resolver.resolve(input);

    expect(scope.grants.get('Host')).toEqual(new Set(['host-1']));
  });

  it.each([
    ['a platform admin', { isPlatformAdmin: true }],
    ['a `manage all` holder', { hasFullAccess: true }],
  ])('still reads the grants of %s', async (_name, flags) => {
    // Regression: a bypass returned no grants, and a bypass no longer reaches
    // a person's rows on its own, so a row granted to an admin by name was out
    // of their reach.
    const { resolver, grants } = resolverWith();
    grants.findActiveForPrincipals.mockResolvedValue([grant('Host', 'host-1')]);

    const scope = await resolver.resolve({ ...input, ...flags });

    expect(scope.bypass).toBe(true);
    expect(scope.grants.get('Host')).toEqual(new Set(['host-1']));
    expect(scope.teamIds).toEqual(['team-1']);
  });
});
