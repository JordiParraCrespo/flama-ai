import type { IncomingHttpHeaders } from 'node:http';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembershipAccessPolicy } from '../../../application/membership-access.policy';
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
  const organizations = { setActive: vi.fn(), session: vi.fn() };
  const invitations = { findOneById: vi.fn() };
  const members = { findMembership: vi.fn() };
  const membershipAccess = { grant: vi.fn() };
  let handler: AcceptInvitationCommandHandler;

  const accept = () =>
    handler.execute(new AcceptInvitationCommand({ headers, invitationId: 'inv1' }));

  beforeEach(() => {
    vi.clearAllMocks();
    invitations.findOneById.mockResolvedValue(Some(invitation));
    members.findMembership.mockResolvedValue(None);
    membershipAccess.grant.mockResolvedValue(undefined);
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
    expect(membershipAccess.grant).toHaveBeenCalledWith('u2', 'org1', 'member');
  });

  it('passes an invited admin’s organization role through to the grant', async () => {
    invitationAuth.accept.mockResolvedValue({
      invitation: { ...invitation, role: 'admin' },
      userId: 'u2',
    });

    await accept();

    expect(membershipAccess.grant).toHaveBeenCalledWith('u2', 'org1', 'admin');
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
    expect(membershipAccess.grant).toHaveBeenCalledWith('u2', 'org1', 'member');
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
});
