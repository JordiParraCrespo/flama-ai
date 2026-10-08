import type { IncomingHttpHeaders } from 'node:http';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { AcceptInvitationCommand } from '../accept-invitation.command';
import { AcceptInvitationCommandHandler } from '../accept-invitation.command-handler';

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
const invitation = {
  id: 'inv1',
  organizationId: 'org1',
  email: 'invitee@x.com',
  role: 'member',
  status: 'pending',
  teamId: null,
  inviterId: 'u1',
  expiresAt: new Date('2024-02-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('AcceptInvitationCommandHandler', () => {
  const invitationAuth = { accept: vi.fn() };
  const organizations = { setActive: vi.fn(), session: vi.fn(), leave: vi.fn() };
  const invitations = { findOneById: vi.fn(), reopen: vi.fn() };
  const members = { findMembership: vi.fn() };
  let membershipAccess: ReturnType<typeof fakeMembershipAccess>;
  let handler: AcceptInvitationCommandHandler;

  const accept = () =>
    handler.execute(new AcceptInvitationCommand({ headers, invitationId: 'inv1' }));

  beforeEach(() => {
    vi.clearAllMocks();
    invitations.findOneById.mockResolvedValue(Some(invitation));
    members.findMembership.mockResolvedValue(None);
    membershipAccess = fakeMembershipAccess();
    handler = new AcceptInvitationCommandHandler(
      invitationAuth as never,
      organizations as never,
      invitations as never,
      members as never,
      membershipAccess as unknown as MembershipAccessPolicy,
    );
  });

  it('accepts a pending invitation and grants the role its organization role stands for', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });

    expect(await accept()).toBe('inv1');
    expect(invitationAuth.accept).toHaveBeenCalledWith(headers, 'inv1');
    expect(membershipAccess.grant).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', organizationId: 'org1', role: 'member' }),
    );
  });

  it('passes an invited admin’s organization role through to the grant', async () => {
    invitationAuth.accept.mockResolvedValue({
      invitation: { ...invitation, role: 'admin' },
      userId: 'u2',
    });

    await accept();

    expect(membershipAccess.grant).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', organizationId: 'org1', role: 'admin' }),
    );
  });

  it('repairs an already-accepted invitation for the same member', async () => {
    invitations.findOneById.mockResolvedValue(Some({ ...invitation, status: 'accepted' }));
    organizations.session.mockResolvedValue({
      userId: 'u2',
      email: 'Invitee@X.com',
      activeOrganizationId: null,
    });
    members.findMembership.mockResolvedValue(Some({ id: 'm2' }));

    expect(await accept()).toBe('inv1');

    expect(invitationAuth.accept).not.toHaveBeenCalled();
    expect(members.findMembership).toHaveBeenCalledWith('org1', 'u2');
    expect(organizations.setActive).toHaveBeenCalledWith(headers, 'org1');
    expect(membershipAccess.grant).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', organizationId: 'org1', role: 'member' }),
    );
  });

  it('does not recover an accepted invitation for a different account', async () => {
    invitations.findOneById.mockResolvedValue(Some({ ...invitation, status: 'accepted' }));
    organizations.session.mockResolvedValue({
      userId: 'u3',
      email: 'other@x.com',
      activeOrganizationId: null,
    });
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u3' });

    await accept();

    expect(organizations.setActive).not.toHaveBeenCalled();
    expect(invitationAuth.accept).toHaveBeenCalled();
  });

  it('does not recover an accepted invitation whose membership is gone', async () => {
    invitations.findOneById.mockResolvedValue(Some({ ...invitation, status: 'accepted' }));
    organizations.session.mockResolvedValue({
      userId: 'u2',
      email: 'invitee@x.com',
      activeOrganizationId: null,
    });
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });

    await accept();

    expect(organizations.setActive).not.toHaveBeenCalled();
    expect(invitationAuth.accept).toHaveBeenCalled();
  });

  it('leaves the organization again when the role its invitation grants cannot be written', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });
    const failure = new Error('Required system role "user" is missing');
    membershipAccess.grant.mockRejectedValueOnce(failure);

    await expect(accept()).rejects.toBe(failure);
    expect(organizations.leave).toHaveBeenCalledWith(headers, 'org1');
    // Better Auth accepts a pending invitation only; without this the retry
    // finds nothing to accept and the invitation is used up.
    expect(invitations.reopen).toHaveBeenCalledWith('inv1');
  });

  it('keeps the invitation accepted when leaving fails, for the replay to repair', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });
    membershipAccess.grant.mockRejectedValueOnce(new Error('role store unavailable'));
    organizations.leave.mockRejectedValueOnce(new Error('leave failed'));

    await expect(accept()).rejects.toThrow('role store unavailable');
    expect(invitations.reopen).not.toHaveBeenCalled();
  });
});
