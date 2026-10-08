import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { RemoveMemberCommand } from '../remove-member.command';
import { RemoveMemberCommandHandler } from '../remove-member.command-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

describe('RemoveMemberCommandHandler', () => {
  const organizations = { removeMember: vi.fn() };
  const members = { findAccounts: vi.fn() };
  const membershipAccess = { revoke: vi.fn() };
  let handler: RemoveMemberCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RemoveMemberCommandHandler(
      organizations as never,
      members as never,
      membershipAccess as unknown as MembershipAccessPolicy,
    );
  });

  it('ends the membership, revokes what it gave, and answers with it', async () => {
    organizations.removeMember.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'member',
      createdAt: new Date(),
      user: null,
    });
    members.findAccounts.mockResolvedValue([{ id: 'u1', email: 'member@x.com' }]);

    const removed = await handler.execute(
      new RemoveMemberCommand({ headers, organizationId: 'org1', memberIdOrEmail: 'm1' }),
    );

    expect(organizations.removeMember).toHaveBeenCalledWith(headers, 'org1', 'm1');
    expect(membershipAccess.revoke).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', organizationId: 'org1' }),
    );
    expect(removed).toMatchObject({ id: 'm1', user: { email: 'member@x.com' } });
  });
});
