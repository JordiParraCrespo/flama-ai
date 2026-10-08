import type { IncomingHttpHeaders } from 'node:http';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { UpdateMemberRoleCommand } from '../update-member-role.command';
import { UpdateMemberRoleCommandHandler } from '../update-member-role.command-handler';

/** The policy's admit sequence over a `grant` double: write, grant, undo on failure. */
function fakeMembershipAccess() {
  const grant = vi.fn().mockResolvedValue(undefined);
  return {
    grant,
    release: vi.fn(),
    admit: vi.fn(
      async <E>(write: () => Promise<E>, undo: (entry: E) => Promise<unknown>): Promise<E> => {
        const entry = await write();
        try {
          await grant(entry);
        } catch (error) {
          try {
            await undo(entry);
          } catch {
            // The real policy logs this; the original failure is what is raised.
          }
          throw error;
        }
        return entry;
      },
    ),
  };
}

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

describe('UpdateMemberRoleCommandHandler', () => {
  const organizations = { updateMemberRole: vi.fn() };
  const members = { findMembershipById: vi.fn() };
  let membershipAccess: ReturnType<typeof fakeMembershipAccess>;
  let handler: UpdateMemberRoleCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    membershipAccess = fakeMembershipAccess();
    members.findMembershipById.mockResolvedValue(Some({ id: 'm1', role: 'member' }));
    handler = new UpdateMemberRoleCommandHandler(
      organizations as never,
      members as never,
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
    expect(membershipAccess.grant).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', organizationId: 'org1', role: 'admin' }),
    );
  });

  it('puts the previous organization role back when the new role cannot be written', async () => {
    organizations.updateMemberRole.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'admin',
    });
    const failure = new Error('role store unavailable');
    membershipAccess.grant.mockRejectedValueOnce(failure);

    await expect(
      handler.execute(
        new UpdateMemberRoleCommand({
          headers,
          organizationId: 'org1',
          memberId: 'm1',
          role: 'admin',
        }),
      ),
    ).rejects.toBe(failure);
    expect(organizations.updateMemberRole).toHaveBeenLastCalledWith(
      headers,
      'org1',
      'm1',
      'member',
    );
  });

  it('has nothing to restore when there was no member to read', async () => {
    members.findMembershipById.mockResolvedValue(None);
    organizations.updateMemberRole.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'admin',
    });
    membershipAccess.grant.mockRejectedValueOnce(new Error('role store unavailable'));

    await expect(
      handler.execute(
        new UpdateMemberRoleCommand({
          headers,
          organizationId: 'org1',
          memberId: 'm1',
          role: 'admin',
        }),
      ),
    ).rejects.toThrow();
    expect(organizations.updateMemberRole).toHaveBeenCalledTimes(1);
  });
});
