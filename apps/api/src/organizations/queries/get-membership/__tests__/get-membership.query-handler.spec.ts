import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetMembershipQuery } from '../get-membership.query';
import { GetMembershipQueryHandler } from '../get-membership.query-handler';

describe('GetMembershipQueryHandler', () => {
  const members = { findMembership: vi.fn(), findAccounts: vi.fn() };
  let handler: GetMembershipQueryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    members.findAccounts.mockResolvedValue([
      {
        id: 'u1',
        name: 'Member One',
        email: 'member@x.com',
        image: null,
        firstName: 'Member',
        lastName: 'One',
        isActive: true,
        emailVerified: true,
      },
    ]);
    handler = new GetMembershipQueryHandler(members as never);
  });

  it("reads the caller's own membership row in the organization named", async () => {
    members.findMembership.mockResolvedValue(
      Some({
        id: 'm1',
        organizationId: 'org1',
        userId: 'u1',
        role: 'owner',
        createdAt: new Date(),
        user: null,
      }),
    );

    const result = await handler.execute(
      new GetMembershipQuery({ organizationId: 'org1', userId: 'u1' }),
    );

    expect(members.findMembership).toHaveBeenCalledWith('org1', 'u1');
    expect(result).toMatchObject({ id: 'm1', organizationId: 'org1', userId: 'u1' });
    expect(result.user).toMatchObject({ email: 'member@x.com' });
  });

  it('refuses a caller with no membership there as not a member (ORG_003)', async () => {
    members.findMembership.mockResolvedValue(None);

    await expect(
      handler.execute(new GetMembershipQuery({ organizationId: 'org1', userId: 'u1' })),
    ).rejects.toMatchObject({ code: 'ORG_003' });
  });
});
