import type { IncomingHttpHeaders } from 'node:http';
import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../auth/auth', () => ({
  auth: {
    api: {
      createOrganization: vi.fn(),
      updateOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      setActiveOrganization: vi.fn(),
      listOrganizations: vi.fn(),
      getFullOrganization: vi.fn(),
      checkOrganizationSlug: vi.fn(),
      listMembers: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      leaveOrganization: vi.fn(),
      getActiveMember: vi.fn(),
    },
  },
}));

import { auth } from '../../auth/auth';
import { OrganizationsService } from '../organizations.service';

const api = auth.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const headers: IncomingHttpHeaders = { cookie: 'session=abc' };

const orgRecord = {
  id: 'org1',
  name: 'Acme',
  slug: 'acme',
  createdAt: '2024-01-01T00:00:00.000Z',
};
const memberRecord = {
  id: 'm1',
  organizationId: 'org1',
  userId: 'u1',
  role: 'owner',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService();
  });

  describe('create', () => {
    it('uses the provided slug', async () => {
      api.createOrganization.mockResolvedValue(orgRecord);
      await service.create(headers, { name: 'Acme', slug: 'custom-slug' });
      expect(api.createOrganization.mock.calls[0][0].body.slug).toBe('custom-slug');
    });

    it('generates a slug from the name when none is provided', async () => {
      api.createOrganization.mockResolvedValue(orgRecord);
      await service.create(headers, { name: 'My Great Org!' });

      const slug: string = api.createOrganization.mock.calls[0][0].body.slug;
      // slugified base + '-' + 8 hex chars
      expect(slug).toMatch(/^my-great-org-[0-9a-f]{8}$/);
    });

    it('falls back to "org" when the name has no alphanumerics', async () => {
      api.createOrganization.mockResolvedValue(orgRecord);
      await service.create(headers, { name: '***' });
      const slug: string = api.createOrganization.mock.calls[0][0].body.slug;
      expect(slug).toMatch(/^org-[0-9a-f]{8}$/);
    });

    it('maps the created organization', async () => {
      api.createOrganization.mockResolvedValue(orgRecord);
      const result = await service.create(headers, { name: 'Acme' });
      expect(result.id).toBe('org1');
    });
  });

  it('updates an organization', async () => {
    api.updateOrganization.mockResolvedValue(orgRecord);
    await service.update(headers, 'org1', { name: 'Acme 2' });
    expect(api.updateOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { data: { name: 'Acme 2' }, organizationId: 'org1' },
      }),
    );
  });

  it('deletes an organization', async () => {
    api.deleteOrganization.mockResolvedValue(orgRecord);
    const result = await service.delete(headers, 'org1');
    expect(result.id).toBe('org1');
    expect(api.deleteOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: 'org1' } }),
    );
  });

  describe('setActive', () => {
    it('maps the organization when Better Auth returns one', async () => {
      api.setActiveOrganization.mockResolvedValue(orgRecord);
      const result = await service.setActive(headers, 'org1');
      expect(result?.id).toBe('org1');
    });

    it('returns null when Better Auth returns a falsy result (cleared active org)', async () => {
      api.setActiveOrganization.mockResolvedValue(null);
      const result = await service.setActive(headers, 'org1');
      expect(result).toBeNull();
    });
  });

  it('lists organizations', async () => {
    api.listOrganizations.mockResolvedValue([orgRecord]);
    const result = await service.list(headers);
    expect(result).toHaveLength(1);
  });

  describe('getFull', () => {
    it('maps a full organization', async () => {
      api.getFullOrganization.mockResolvedValue({
        ...orgRecord,
        members: [memberRecord],
      });
      const result = await service.getFull(headers, 'org1');
      expect(result?.members).toHaveLength(1);
    });

    it('returns null when no organization is found', async () => {
      api.getFullOrganization.mockResolvedValue(null);
      expect(await service.getFull(headers, 'org1')).toBeNull();
    });
  });

  describe('checkSlug', () => {
    it('returns available:true when Better Auth does not throw', async () => {
      api.checkOrganizationSlug.mockResolvedValue({ status: true });
      expect(await service.checkSlug(headers, 'free-slug')).toEqual({
        available: true,
      });
    });

    it('returns available:false when Better Auth throws an APIError (slug taken)', async () => {
      api.checkOrganizationSlug.mockRejectedValue(
        new APIError('BAD_REQUEST', { message: 'taken' }),
      );
      expect(await service.checkSlug(headers, 'taken-slug')).toEqual({
        available: false,
      });
    });

    it('rethrows non-APIError failures', async () => {
      api.checkOrganizationSlug.mockRejectedValue(new Error('network down'));
      await expect(service.checkSlug(headers, 'x')).rejects.toThrow('network down');
    });
  });

  describe('members', () => {
    it('lists members unwrapping the `{ members }` envelope', async () => {
      api.listMembers.mockResolvedValue({ members: [memberRecord] });
      const result = await service.listMembers(headers, 'org1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m1');
    });

    it('adds a member forwarding role and teamId', async () => {
      api.addMember.mockResolvedValue(memberRecord);
      await service.addMember(headers, 'org1', {
        userId: 'u1',
        role: 'member',
        teamId: 'team1',
      });
      expect(api.addMember).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            userId: 'u1',
            role: 'member',
            organizationId: 'org1',
            teamId: 'team1',
          },
        }),
      );
    });

    it('removes a member unwrapping the `{ member }` envelope', async () => {
      api.removeMember.mockResolvedValue({ member: memberRecord });
      const result = await service.removeMember(headers, 'org1', 'm1');
      expect(result.id).toBe('m1');
    });

    it('updates a member role', async () => {
      api.updateMemberRole.mockResolvedValue(memberRecord);
      await service.updateMemberRole(headers, 'org1', 'm1', 'admin');
      expect(api.updateMemberRole).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { memberId: 'm1', role: 'admin', organizationId: 'org1' },
        }),
      );
    });

    it('leaves an organization', async () => {
      api.leaveOrganization.mockResolvedValue(memberRecord);
      const result = await service.leave(headers, 'org1');
      expect(result.id).toBe('m1');
    });

    it('gets the active member', async () => {
      api.getActiveMember.mockResolvedValue(memberRecord);
      const result = await service.getActiveMember(headers);
      expect(result.userId).toBe('u1');
    });
  });
});
