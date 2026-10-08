import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { AddMemberCommand } from '../add-member.command';
import { AddMemberCommandHandler } from '../add-member.command-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

describe('AddMemberCommandHandler', () => {
  const organizations = { addMember: vi.fn() };
  const membershipAccess = { grant: vi.fn() };
  let handler: AddMemberCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new AddMemberCommandHandler(
      organizations as never,
      membershipAccess as unknown as MembershipAccessPolicy,
    );
  });

  it('adds the member and grants the role their organization role stands for', async () => {
    organizations.addMember.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'member',
    });
    const input = { userId: 'u1', role: 'member' as const, teamId: 'team1' };

    const id = await handler.execute(
      new AddMemberCommand({ headers, organizationId: 'org1', input }),
    );

    expect(id).toBe('m1');
    expect(organizations.addMember).toHaveBeenCalledWith(headers, 'org1', input);
    expect(membershipAccess.grant).toHaveBeenCalledWith('u1', 'org1', 'member');
  });
});
