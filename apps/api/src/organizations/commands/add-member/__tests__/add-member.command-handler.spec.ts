import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { AddMemberCommand } from '../add-member.command';
import { AddMemberCommandHandler } from '../add-member.command-handler';

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

describe('AddMemberCommandHandler', () => {
  const organizations = { addMember: vi.fn(), removeMember: vi.fn() };
  let membershipAccess: ReturnType<typeof fakeMembershipAccess>;
  let handler: AddMemberCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    membershipAccess = fakeMembershipAccess();
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
    expect(membershipAccess.grant).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', organizationId: 'org1', role: 'member' }),
    );
  });

  it('takes the member back off the roster when their role cannot be written', async () => {
    organizations.addMember.mockResolvedValue({
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      role: 'member',
    });
    const failure = new Error('role store unavailable');
    membershipAccess.grant.mockRejectedValueOnce(failure);

    await expect(
      handler.execute(
        new AddMemberCommand({
          headers,
          organizationId: 'org1',
          input: { userId: 'u1', role: 'member' as const },
        }),
      ),
    ).rejects.toBe(failure);
    expect(organizations.removeMember).toHaveBeenCalledWith(headers, 'org1', 'm1');
  });
});
