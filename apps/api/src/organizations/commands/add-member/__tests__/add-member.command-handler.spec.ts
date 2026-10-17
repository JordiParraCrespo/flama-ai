import type { IncomingHttpHeaders } from 'node:http';
import { Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { AddMemberCommand } from '../add-member.command';
import { AddMemberCommandHandler } from '../add-member.command-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };
const input = { userId: 'u1', role: 'member' as const, teamId: 'team1' };

describe('AddMemberCommandHandler', () => {
  const organizations = { addMember: vi.fn(), removeMember: vi.fn() };
  const roles = { findOneByName: vi.fn() };
  const userRoles = { findRoleIdsForUser: vi.fn(), setRolesForUser: vi.fn() };
  let handler: AddMemberCommandHandler;

  const add = () =>
    handler.execute(new AddMemberCommand({ headers, organizationId: 'org1', input }));

  beforeEach(() => {
    vi.clearAllMocks();
    organizations.addMember.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'member',
    });
    roles.findOneByName.mockImplementation(async (name: string) => Some({ id: `${name}-role` }));
    userRoles.findRoleIdsForUser.mockResolvedValue([]);
    userRoles.setRolesForUser.mockResolvedValue(undefined);
    handler = new AddMemberCommandHandler(
      organizations as never,
      new MembershipAccessPolicy(roles as never, userRoles as never, {} as never),
    );
  });

  it('adds the member and grants the role their organization role stands for', async () => {
    expect(await add()).toBe('m1');
    expect(organizations.addMember).toHaveBeenCalledWith(headers, 'org1', input);
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['user-role'], 'org1');
  });

  it('takes the member back off the roster when their role cannot be written', async () => {
    const failure = new Error('role store unavailable');
    userRoles.setRolesForUser.mockRejectedValueOnce(failure);

    await expect(add()).rejects.toBe(failure);
    expect(organizations.removeMember).toHaveBeenCalledWith(headers, 'org1', 'm1');
  });
});
