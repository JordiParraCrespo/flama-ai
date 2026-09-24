import { describe, expect, it } from 'vitest';
import { organizationsKeys } from '../organizations.queries';

/**
 * The member list is narrowed by the server, which makes its cache key a
 * correctness concern rather than a detail: what a mutation can invalidate is
 * exactly what prefixes exist. What invalidating a key reaches is asked of a
 * real `QueryClient` in `query-keys.spec.ts`; this file pins the narrowing.
 */
describe('organizationsKeys.members', () => {
  const ORG = 'org-1';

  it('nests from generic to specific', () => {
    expect(organizationsKeys.all).toEqual(['organizations']);
    expect(organizationsKeys.members(ORG)).toEqual(['organizations', 'members', ORG]);
    expect(organizationsKeys.members(ORG, { search: 'ada', roleIds: ['role-a'] })).toEqual([
      'organizations',
      'members',
      ORG,
      { search: 'ada', roleIds: ['role-a'] },
    ]);
  });

  it('asks the same question once however the roles were picked', () => {
    // The facet appends in click order; an unsorted key would fetch the same
    // answer twice and cache it under two entries.
    expect(organizationsKeys.members(ORG, { roleIds: ['b', 'a'] })).toEqual(
      organizationsKeys.members(ORG, { roleIds: ['a', 'b'] }),
    );
  });

  it('treats an empty facet as no facet', () => {
    expect(organizationsKeys.members(ORG, { roleIds: [] })).toEqual(organizationsKeys.members(ORG));
    expect(organizationsKeys.members(ORG, { search: '' })).toEqual(organizationsKeys.members(ORG));
  });

  it('separates two different narrowings', () => {
    expect(organizationsKeys.members(ORG, { roleIds: ['a'] })).not.toEqual(
      organizationsKeys.members(ORG, { roleIds: ['b'] }),
    );
    expect(organizationsKeys.members(ORG, { search: 'ada' })).not.toEqual(
      organizationsKeys.members(ORG, { search: 'bob' }),
    );
    expect(organizationsKeys.members(ORG)).not.toEqual(organizationsKeys.members('org-2'));
  });
});
