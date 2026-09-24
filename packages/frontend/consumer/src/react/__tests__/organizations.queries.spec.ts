import { describe, expect, it } from 'vitest';
import { organizationsKeys } from '../organizations.queries';

/**
 * The member list is narrowed by the server, which makes its cache key a
 * correctness concern rather than a detail: what a mutation can invalidate is
 * exactly what prefixes exist. What invalidating a key reaches is asked of a
 * real `QueryClient` in `query-keys.spec.ts`; this file pins the narrowing.
 */
describe('organizationsKeys.memberList', () => {
  const ORG = 'org-1';

  it('nests from generic to specific', () => {
    expect(organizationsKeys.all).toEqual(['organizations']);
    expect(organizationsKeys.memberList(ORG)).toEqual(['organizations', 'members', 'list', ORG]);
    expect(organizationsKeys.memberList(ORG, { search: 'ada', roleIds: ['role-a'] })).toEqual([
      'organizations',
      'members',
      'list',
      ORG,
      { search: 'ada', roleIds: ['role-a'] },
    ]);
  });

  it('asks the same question once however the roles were picked', () => {
    // The facet appends in click order; an unsorted key would fetch the same
    // answer twice and cache it under two entries.
    expect(organizationsKeys.memberList(ORG, { roleIds: ['b', 'a'] })).toEqual(
      organizationsKeys.memberList(ORG, { roleIds: ['a', 'b'] }),
    );
  });

  it('treats an empty facet as no facet', () => {
    expect(organizationsKeys.memberList(ORG, { roleIds: [] })).toEqual(
      organizationsKeys.memberList(ORG),
    );
    expect(organizationsKeys.memberList(ORG, { search: '' })).toEqual(
      organizationsKeys.memberList(ORG),
    );
  });

  it('separates two different narrowings', () => {
    expect(organizationsKeys.memberList(ORG, { roleIds: ['a'] })).not.toEqual(
      organizationsKeys.memberList(ORG, { roleIds: ['b'] }),
    );
    expect(organizationsKeys.memberList(ORG, { search: 'ada' })).not.toEqual(
      organizationsKeys.memberList(ORG, { search: 'bob' }),
    );
    expect(organizationsKeys.memberList(ORG)).not.toEqual(organizationsKeys.memberList('org-2'));
  });
});
