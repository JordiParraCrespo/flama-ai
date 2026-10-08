import type { IncomingHttpHeaders } from 'node:http';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { AcceptInvitationCommand } from '../accept-invitation.command';
import { AcceptInvitationCommandHandler } from '../accept-invitation.command-handler';

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
  const invitations = { findOneById: vi.fn(), reopen: vi.fn(), markAccepted: vi.fn() };
  const members = { findMembership: vi.fn() };
  // The real policy over the role store's doubles.
  const roles = { findOneByName: vi.fn() };
  const userRoles = { findRoleIdsForUser: vi.fn(), setRolesForUser: vi.fn() };
  let handler: AcceptInvitationCommandHandler;

  const accept = () =>
    handler.execute(new AcceptInvitationCommand({ headers, invitationId: 'inv1' }));

  beforeEach(() => {
    vi.clearAllMocks();
    invitations.findOneById.mockResolvedValue(Some(invitation));
    members.findMembership.mockResolvedValue(None);
    roles.findOneByName.mockImplementation(async (name: string) => Some({ id: `${name}-role` }));
    userRoles.findRoleIdsForUser.mockResolvedValue([]);
    userRoles.setRolesForUser.mockResolvedValue(undefined);
    handler = new AcceptInvitationCommandHandler(
      invitationAuth as never,
      organizations as never,
      invitations as never,
      members as never,
      new MembershipAccessPolicy(roles as never, userRoles as never, {} as never),
    );
  });

  it('accepts a pending invitation and grants the role its organization role stands for', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });

    expect(await accept()).toBe('inv1');
    expect(invitationAuth.accept).toHaveBeenCalledWith(headers, 'inv1');
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u2', ['user-role'], 'org1');
  });

  it('grants an invited admin the org-scoped owner role, never the global admin', async () => {
    invitationAuth.accept.mockResolvedValue({
      invitation: { ...invitation, role: 'admin' },
      userId: 'u2',
    });

    await accept();

    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u2', ['owner-role'], 'org1');
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
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u2', ['user-role'], 'org1');
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
    userRoles.setRolesForUser.mockRejectedValueOnce(failure);

    await expect(accept()).rejects.toBe(failure);
    expect(organizations.leave).toHaveBeenCalledWith(headers, 'org1');
    // Better Auth accepts a pending invitation only; without this the retry
    // finds nothing to accept and the invitation is used up.
    expect(invitations.reopen).toHaveBeenCalledWith('inv1');
  });

  it('puts the invitation back to accepted when leaving fails, for the replay to repair', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });
    userRoles.setRolesForUser.mockRejectedValueOnce(new Error('role store unavailable'));
    organizations.leave.mockRejectedValueOnce(new Error('leave failed'));

    await expect(accept()).rejects.toThrow('role store unavailable');
    expect(invitations.reopen).toHaveBeenCalledWith('inv1');
    expect(invitations.markAccepted).toHaveBeenCalledWith('inv1');
  });

  /**
   * Reopening first is what makes a failed reopen harmless: the membership is
   * still there and the invitation still accepted, so the replay grants the
   * role on retry. Leaving first would strand an accepted invitation with no
   * membership, which neither Better Auth nor the replay could take back.
   */
  it('stays a member with the invitation accepted when reopening fails', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });
    userRoles.setRolesForUser.mockRejectedValueOnce(new Error('role store unavailable'));
    invitations.reopen.mockRejectedValueOnce(new Error('invitation table locked'));

    await expect(accept()).rejects.toThrow('role store unavailable');
    expect(organizations.leave).not.toHaveBeenCalled();
  });

  /**
   * The retry an undone acceptance has to leave possible: the membership is
   * gone and the invitation is pending again, so the next attempt accepts it
   * afresh instead of finding nothing to accept and no membership to repair.
   */
  it('lets a retry accept the invitation again after an undone acceptance', async () => {
    invitationAuth.accept.mockResolvedValue({ invitation, userId: 'u2' });
    userRoles.setRolesForUser.mockRejectedValueOnce(new Error('role store unavailable'));
    await expect(accept()).rejects.toThrow('role store unavailable');
    expect(invitations.reopen).toHaveBeenCalledWith('inv1');

    // The reopened invitation reads as pending, so no replay: a fresh accept.
    invitations.findOneById.mockResolvedValue(Some(invitation));
    expect(await accept()).toBe('inv1');
    expect(invitationAuth.accept).toHaveBeenCalledTimes(2);
    expect(userRoles.setRolesForUser).toHaveBeenLastCalledWith('u2', ['user-role'], 'org1');
  });
});
