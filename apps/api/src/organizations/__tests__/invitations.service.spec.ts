import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../auth/auth', () => ({
  auth: {
    api: {
      createInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
      cancelInvitation: vi.fn(),
      getInvitation: vi.fn(),
      listInvitations: vi.fn(),
      listUserInvitations: vi.fn(),
    },
  },
}));

import { auth } from '../../auth/auth';
import { InvitationsService } from '../invitations.service';

const api = auth.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

const invitation = {
  id: 'inv1',
  organizationId: 'org1',
  email: 'invitee@x.com',
  role: 'member',
  status: 'pending',
  inviterId: 'u1',
  expiresAt: '2024-02-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('InvitationsService', () => {
  let service: InvitationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InvitationsService();
  });

  it('invites a member forwarding email, role and teamId', async () => {
    api.createInvitation.mockResolvedValue(invitation);
    const result = await service.invite(headers, 'org1', {
      email: 'invitee@x.com',
      role: 'member',
      teamId: 'team1',
    });
    expect(result.id).toBe('inv1');
    expect(api.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          email: 'invitee@x.com',
          role: 'member',
          organizationId: 'org1',
          teamId: 'team1',
        },
      }),
    );
  });

  it('accepts an invitation unwrapping the `{ invitation }` envelope', async () => {
    api.acceptInvitation.mockResolvedValue({ invitation });
    const result = await service.accept(headers, 'inv1');
    expect(result.id).toBe('inv1');
    expect(api.acceptInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ body: { invitationId: 'inv1' } }),
    );
  });

  it('rejects an invitation unwrapping the `{ invitation }` envelope', async () => {
    api.rejectInvitation.mockResolvedValue({ invitation });
    const result = await service.reject(headers, 'inv1');
    expect(result.id).toBe('inv1');
  });

  it('cancels an invitation (bare result, no envelope)', async () => {
    api.cancelInvitation.mockResolvedValue(invitation);
    const result = await service.cancel(headers, 'inv1');
    expect(result.status).toBe('pending');
  });

  it('gets an invitation by id via the query param', async () => {
    api.getInvitation.mockResolvedValue(invitation);
    await service.get(headers, 'inv1');
    expect(api.getInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ query: { id: 'inv1' } }),
    );
  });

  it('lists invitations for an organization', async () => {
    api.listInvitations.mockResolvedValue([invitation, invitation]);
    const result = await service.listForOrganization(headers, 'org1');
    expect(result).toHaveLength(2);
    expect(api.listInvitations).toHaveBeenCalledWith(
      expect.objectContaining({ query: { organizationId: 'org1' } }),
    );
  });

  it('lists invitations for the caller', async () => {
    api.listUserInvitations.mockResolvedValue([invitation]);
    const result = await service.listForCaller(headers);
    expect(result).toHaveLength(1);
  });
});
