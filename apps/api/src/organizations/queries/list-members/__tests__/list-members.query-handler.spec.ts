import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberFilters } from '../../../domain/member-search.policy';
import type { AssignedRole } from '../../../domain/membership.types';
import { ListMembersQuery } from '../list-members.query';
import { ListMembersQueryHandler } from '../list-members.query-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };
const member = {
  id: 'm1',
  organizationId: 'org1',
  userId: 'u1',
  role: 'owner',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  user: null,
};
const account = {
  id: 'u1',
  name: 'Member One',
  email: 'member@x.com',
  image: null,
  firstName: 'Member',
  lastName: 'One',
  isActive: true,
  emailVerified: true,
};

describe('ListMembersQueryHandler', () => {
  const organizations = { listMembers: vi.fn() };
  const members = { findAccounts: vi.fn(), findAssignedRoles: vi.fn() };
  let handler: ListMembersQueryHandler;
  let assigned: AssignedRole[];

  const list = (filters: MemberFilters = {}) =>
    handler.execute(new ListMembersQuery({ headers, organizationId: 'org1', filters }));

  beforeEach(() => {
    vi.clearAllMocks();
    assigned = [];
    organizations.listMembers.mockResolvedValue([member]);
    members.findAccounts.mockResolvedValue([account]);
    members.findAssignedRoles.mockImplementation(async () => new Map([['u1', assigned]]));
    handler = new ListMembersQueryHandler(organizations as never, members as never);
  });

  it('puts the account behind each member on it', async () => {
    const result = await list();
    expect(result).toHaveLength(1);
    expect(result[0].user).toMatchObject({ id: 'u1', name: 'Member One', email: 'member@x.com' });
    // Nothing to narrow by, so the assigned roles are not read.
    expect(members.findAssignedRoles).not.toHaveBeenCalled();
  });

  it('keeps a member holding any of the requested roles', async () => {
    assigned.push({ id: 'role-admin', name: 'admin' });
    expect(await list({ roleIds: ['role-superadmin', 'role-admin'] })).toHaveLength(1);
  });

  it('drops a member holding none of them', async () => {
    assigned.push({ id: 'role-user', name: 'user' });
    expect(await list({ roleIds: ['role-superadmin'] })).toHaveLength(0);
  });

  it('drops a member with no assigned role at all', async () => {
    members.findAssignedRoles.mockResolvedValue(new Map());
    expect(await list({ roleIds: ['role-admin'] })).toHaveLength(0);
  });

  it('applies the search and the role facet together, not either/or', async () => {
    assigned.push({ id: 'role-admin', name: 'admin' });

    // Holds the role, but the search does not match — one filter passing is
    // not enough, or a facet would widen the list the search narrowed.
    expect(await list({ search: 'nobody', roleIds: ['role-admin'] })).toHaveLength(0);
    expect(await list({ search: 'Member One', roleIds: ['role-admin'] })).toHaveLength(1);
  });

  it('matches the search against an assigned role name', async () => {
    assigned.push({ id: 'role-admin', name: 'admin' });
    expect(await list({ search: 'admin' })).toHaveLength(1);
  });
});
