import { MEMBER_LISTS_KEY } from '@flama/frontend-core/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { organizationsKeys } from '../organizations.queries';

/**
 * The key shapes, and what invalidating one of them reaches. Reach is asked of
 * a real `QueryClient`, so the answer is React Query's own matcher.
 */

function cacheWith(...keys: (readonly unknown[])[]) {
  const client = new QueryClient();
  for (const key of keys) client.setQueryData(key, 'cached');
  return client;
}

const invalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated ?? false;

describe('organizationsKeys', () => {
  it('gives members and invitations the full ladder, one function per level', () => {
    expect(organizationsKeys.members()).toEqual(['organizations', 'members']);
    expect(organizationsKeys.memberLists()).toEqual(['organizations', 'members', 'list']);
    expect(organizationsKeys.memberList('org-1')).toEqual([
      'organizations',
      'members',
      'list',
      'org-1',
    ]);
    expect(organizationsKeys.memberList('org-1', { search: 'ada', roleIds: ['b', 'a'] })).toEqual([
      ...organizationsKeys.memberList('org-1'),
      { search: 'ada', roleIds: ['a', 'b'] },
    ]);
    expect(organizationsKeys.invitations()).toEqual(['organizations', 'invitations']);
    expect(organizationsKeys.invitationLists()).toEqual(['organizations', 'invitations', 'list']);
    expect(organizationsKeys.invitationList('org-1')).toEqual([
      'organizations',
      'invitations',
      'list',
      'org-1',
    ]);
    expect(organizationsKeys.myInvitations()).toEqual(['organizations', 'invitations', 'mine']);
    expect(organizationsKeys.list()).toEqual(['organizations', 'list']);
  });

  it('keeps the kernel contract the plugins invalidate by', () => {
    // A product outside this repo may name the tuple rather than import it.
    expect(MEMBER_LISTS_KEY).toEqual(['organizations', 'members']);
    expect(organizationsKeys.members()).toEqual([...MEMBER_LISTS_KEY]);
  });

  it('keeps an organization nobody chose as undefined rather than a made-up one', () => {
    expect(organizationsKeys.memberList(undefined)).toContain(undefined);
    expect(organizationsKeys.invitationList(undefined)).toContain(undefined);
  });

  it('refreshes every narrowing of one organization’s members, and nothing else', async () => {
    const plain = organizationsKeys.memberList('org-1');
    const searched = organizationsKeys.memberList('org-1', { search: 'ada' });
    const faceted = organizationsKeys.memberList('org-1', { search: 'ada', roleIds: ['b', 'a'] });
    const invitations = organizationsKeys.invitationList('org-1');
    const otherOrg = organizationsKeys.memberList('org-2');
    const client = cacheWith(plain, searched, faceted, invitations, otherOrg);

    await client.invalidateQueries({ queryKey: organizationsKeys.memberList('org-1') });

    expect(invalidated(client, plain)).toBe(true);
    expect(invalidated(client, searched)).toBe(true);
    expect(invalidated(client, faceted)).toBe(true);
    expect(invalidated(client, invitations)).toBe(false);
    expect(invalidated(client, otherOrg)).toBe(false);
  });

  it('refreshes one organization’s invitations without touching the caller’s own', async () => {
    const invitations = organizationsKeys.invitationList('org-1');
    const members = organizationsKeys.memberList('org-1');
    const mine = organizationsKeys.myInvitations();
    const client = cacheWith(invitations, members, mine);

    await client.invalidateQueries({ queryKey: organizationsKeys.invitationList('org-1') });

    expect(invalidated(client, invitations)).toBe(true);
    expect(invalidated(client, members)).toBe(false);
    expect(invalidated(client, mine)).toBe(false);
  });

  it('reaches every organization’s member lists through the kernel contract, and only those', async () => {
    // Another product invalidates `MEMBER_LISTS_KEY` when a user's roles change:
    // it knows the user, not the organizations they belong to.
    const members = [
      organizationsKeys.memberList('org-1'),
      organizationsKeys.memberList('org-1', { roleIds: ['role-a'] }),
      organizationsKeys.memberList('org-2', { search: 'ada' }),
    ];
    const untouched = [
      organizationsKeys.list(),
      organizationsKeys.invitationList('org-1'),
      organizationsKeys.myInvitations(),
    ];
    const client = cacheWith(...members, ...untouched);

    await client.invalidateQueries({ queryKey: MEMBER_LISTS_KEY });

    for (const key of members) expect(invalidated(client, key)).toBe(true);
    for (const key of untouched) expect(invalidated(client, key)).toBe(false);
  });
});
