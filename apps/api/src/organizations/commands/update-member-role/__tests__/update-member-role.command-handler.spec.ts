import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { UpdateMemberRoleCommand } from '../update-member-role.command';
import { UpdateMemberRoleCommandHandler } from '../update-member-role.command-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

describe('UpdateMemberRoleCommandHandler', () => {
  const organizations = { updateMemberRole: vi.fn() };
  const membershipAccess = { grant: vi.fn() };
  let handler: UpdateMemberRoleCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateMemberRoleCommandHandler(
      organizations as never,
      membershipAccess as unknown as MembershipAccessPolicy,
    );
  });

  it('changes the organization role and the application role that stands for it', async () => {
    organizations.updateMemberRole.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'admin',
    });

    const id = await handler.execute(
      new UpdateMemberRoleCommand({
        headers,
        organizationId: 'org1',
        memberId: 'm1',
        role: 'admin',
      }),
    );

    expect(id).toBe('m1');
    expect(organizations.updateMemberRole).toHaveBeenCalledWith(headers, 'org1', 'm1', 'admin');
    expect(membershipAccess.grant).toHaveBeenCalledWith('u1', 'org1', 'admin');
  });
});
