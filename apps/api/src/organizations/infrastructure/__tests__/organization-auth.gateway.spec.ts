import type { IncomingHttpHeaders } from 'node:http';
import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../auth/infrastructure/better-auth.config', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
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
    },
  },
}));

import { auth } from '../../../auth/infrastructure/better-auth.config';
import { OrganizationAuthGateway } from '../organization-auth.gateway';

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

describe('OrganizationAuthGateway', () => {
  let gateway: OrganizationAuthGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new OrganizationAuthGateway();
  });

  describe('session', () => {
    it('reads who the caller is and which organization they have selected', async () => {
      api.getSession.mockResolvedValue({
        user: { id: 'u1', email: 'u1@x.com' },
        session: { activeOrganizationId: 'org1' },
      });
      expect(await gateway.session(headers)).toEqual({
        userId: 'u1',
        email: 'u1@x.com',
        activeOrganizationId: 'org1',
      });
    });

    it('answers null for a request Better Auth resolved without a session', async () => {
      api.getSession.mockResolvedValue(null);
      expect(await gateway.session(headers)).toBeNull();
    });
  });

  it('creates an organization with the slug it is given', async () => {
    api.createOrganization.mockResolvedValue(orgRecord);
    const result = await gateway.create(headers, { name: 'Acme', slug: 'custom-slug' });
    expect(result.id).toBe('org1');
    expect(api.createOrganization.mock.calls[0][0].body).toEqual({
      name: 'Acme',
      slug: 'custom-slug',
      logo: undefined,
    });
  });

  it('updates an organization', async () => {
    api.updateOrganization.mockResolvedValue(orgRecord);
    await gateway.update(headers, 'org1', { name: 'Acme 2' });
    expect(api.updateOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { data: { name: 'Acme 2' }, organizationId: 'org1' },
      }),
    );
  });

  it('deletes an organization', async () => {
    api.deleteOrganization.mockResolvedValue(orgRecord);
    const result = await gateway.delete(headers, 'org1');
    expect(result.id).toBe('org1');
    expect(api.deleteOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: 'org1' } }),
    );
  });

  describe('setActive', () => {
    it('maps the organization when Better Auth returns one', async () => {
      api.setActiveOrganization.mockResolvedValue(orgRecord);
      const result = await gateway.setActive(headers, 'org1');
      expect(result?.id).toBe('org1');
    });

    it('returns null when Better Auth returns a falsy result (cleared active org)', async () => {
      api.setActiveOrganization.mockResolvedValue(null);
      expect(await gateway.setActive(headers, 'org1')).toBeNull();
    });
  });

  it('lists organizations', async () => {
    api.listOrganizations.mockResolvedValue([orgRecord]);
    expect(await gateway.list(headers)).toHaveLength(1);
  });

  describe('getFull', () => {
    it('maps a full organization', async () => {
      api.getFullOrganization.mockResolvedValue({ ...orgRecord, members: [memberRecord] });
      const result = await gateway.getFull(headers, 'org1');
      expect(result?.members).toHaveLength(1);
    });

    it('returns null when no organization is found', async () => {
      api.getFullOrganization.mockResolvedValue(null);
      expect(await gateway.getFull(headers, 'org1')).toBeNull();
    });
  });

  describe('isSlugAvailable', () => {
    it('answers true when Better Auth does not throw', async () => {
      api.checkOrganizationSlug.mockResolvedValue({ status: true });
      expect(await gateway.isSlugAvailable(headers, 'free-slug')).toBe(true);
    });

    it('answers false when Better Auth says the slug is taken', async () => {
      api.checkOrganizationSlug.mockRejectedValue(
        new APIError('BAD_REQUEST', {
          message: 'Organization slug already taken',
          code: 'ORGANIZATION_SLUG_ALREADY_TAKEN',
        }),
      );
      expect(await gateway.isSlugAvailable(headers, 'taken-slug')).toBe(false);
    });

    /**
     * Any other refusal used to read as "taken": a client was told to pick
     * another slug when the plugin had failed, and would never learn why.
     */
    it('raises any other Better Auth failure as the organization problem it is', async () => {
      api.checkOrganizationSlug.mockRejectedValue(
        new APIError('INTERNAL_SERVER_ERROR', { message: 'database unavailable' }),
      );
      await expect(gateway.isSlugAvailable(headers, 'x')).rejects.toMatchObject({
        code: 'ORG_016',
      });
    });

    it('raises a failure that is not an APIError as an upstream failure too', async () => {
      api.checkOrganizationSlug.mockRejectedValue(new Error('network down'));
      await expect(gateway.isSlugAvailable(headers, 'x')).rejects.toMatchObject({
        code: 'ORG_016',
      });
    });
  });

  describe('listMembers', () => {
    const member = (n: number) => ({ ...memberRecord, id: `m${n}`, userId: `u${n}` });

    it('lists members unwrapping the `{ members }` envelope, oldest first', async () => {
      api.listMembers.mockResolvedValue({ members: [memberRecord], total: 1 });
      const result = await gateway.listMembers(headers, 'org1');
      expect(result.map((m) => m.id)).toEqual(['m1']);
      expect(api.listMembers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            organizationId: 'org1',
            limit: 100,
            offset: 0,
            sortBy: 'createdAt',
            sortDirection: 'asc',
          },
        }),
      );
    });

    /**
     * Better Auth answers at most `membershipLimit` (100) members per call. The
     * members list and its filters work on what this returns, so stopping at
     * one page dropped everyone past the hundredth from both.
     */
    it('reads every page of a roster longer than one answer', async () => {
      const roster = Array.from({ length: 230 }, (_, i) => member(i));
      api.listMembers.mockImplementation(async ({ query }: { query: { offset: number } }) => ({
        members: roster.slice(query.offset, query.offset + 100),
        total: roster.length,
      }));

      const result = await gateway.listMembers(headers, 'org1');

      expect(result).toHaveLength(230);
      expect(api.listMembers.mock.calls.map(([call]) => call.query.offset)).toEqual([0, 100, 200]);
    });

    it('stops on an exact multiple of the page size without asking for an empty page', async () => {
      const roster = Array.from({ length: 100 }, (_, i) => member(i));
      api.listMembers.mockResolvedValue({ members: roster, total: 100 });

      expect(await gateway.listMembers(headers, 'org1')).toHaveLength(100);
      expect(api.listMembers).toHaveBeenCalledTimes(1);
    });
  });

  it('adds a member forwarding role and teamId', async () => {
    api.addMember.mockResolvedValue({ ...memberRecord, role: 'member' });
    await gateway.addMember(headers, 'org1', { userId: 'u1', role: 'member', teamId: 'team1' });
    expect(api.addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: 'u1', role: 'member', organizationId: 'org1', teamId: 'team1' },
      }),
    );
  });

  it('removes a member unwrapping the `{ member }` envelope', async () => {
    api.removeMember.mockResolvedValue({ member: memberRecord });
    const result = await gateway.removeMember(headers, 'org1', 'm1');
    expect(result.id).toBe('m1');
    expect(api.removeMember).toHaveBeenCalledWith(
      expect.objectContaining({ body: { memberIdOrEmail: 'm1', organizationId: 'org1' } }),
    );
  });

  it('updates a member role', async () => {
    api.updateMemberRole.mockResolvedValue(memberRecord);
    await gateway.updateMemberRole(headers, 'org1', 'm1', 'admin');
    expect(api.updateMemberRole).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { memberId: 'm1', role: 'admin', organizationId: 'org1' },
      }),
    );
  });

  it('leaves an organization', async () => {
    api.leaveOrganization.mockResolvedValue(memberRecord);
    const result = await gateway.leave(headers, 'org1');
    expect(result.id).toBe('m1');
  });
});
