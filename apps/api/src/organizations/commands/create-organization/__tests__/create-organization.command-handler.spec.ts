import type { IncomingHttpHeaders } from 'node:http';
import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipAccessPolicy } from '../../../application/membership-access.policy';
import { CreateOrganizationCommand } from '../create-organization.command';
import { CreateOrganizationCommandHandler } from '../create-organization.command-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };
const organization = {
  id: 'org1',
  name: 'Acme',
  slug: 'acme',
  logo: null,
  metadata: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('CreateOrganizationCommandHandler', () => {
  const organizations = { create: vi.fn(), delete: vi.fn() };
  const workspaces = { create: vi.fn(), addMember: vi.fn(), setActive: vi.fn() };
  // The real policy over the role store's doubles, so the undo under test is
  // the one the policy runs.
  const roles = { findOneByName: vi.fn() };
  const userRoles = { findRoleIdsForUser: vi.fn(), setRolesForUser: vi.fn() };
  let handler: CreateOrganizationCommandHandler;

  const create = (input: { name: string; slug?: string }) =>
    handler.execute(new CreateOrganizationCommand({ headers, input, creatorId: 'u1' }));
  const slugSent = (): string => organizations.create.mock.calls[0][1].slug;

  beforeEach(() => {
    vi.clearAllMocks();
    organizations.create.mockResolvedValue(organization);
    workspaces.create.mockResolvedValue({ id: 'team1' });
    roles.findOneByName.mockImplementation(async (name: string) => Some({ id: `${name}-role` }));
    userRoles.findRoleIdsForUser.mockResolvedValue([]);
    userRoles.setRolesForUser.mockResolvedValue(undefined);
    handler = new CreateOrganizationCommandHandler(
      organizations as never,
      workspaces as never,
      new MembershipAccessPolicy(roles as never, userRoles as never, {} as never),
    );
  });

  it('uses the provided slug', async () => {
    await create({ name: 'Acme', slug: 'custom-slug' });
    expect(slugSent()).toBe('custom-slug');
  });

  it('generates a slug from the name when none is provided', async () => {
    await create({ name: 'My Great Org!' });
    // slugified base + '-' + 8 hex chars
    expect(slugSent()).toMatch(/^my-great-org-[0-9a-f]{8}$/);
  });

  it('falls back to "org" when the name has no alphanumerics', async () => {
    await create({ name: '***' });
    expect(slugSent()).toMatch(/^org-[0-9a-f]{8}$/);
  });

  /**
   * The bug this exists to stop: Better Auth's `owner` membership is not what
   * the app's routes check, so an organization created without the
   * org-scoped application role is one its creator owns and cannot read.
   */
  it('grants the creator the org-scoped role that opens the organization', async () => {
    expect(await create({ name: 'Acme' })).toBe('org1');
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['owner-role'], 'org1');
  });

  it('gives the organization a default workspace with its creator in it', async () => {
    await create({ name: 'Acme' });

    expect(workspaces.create).toHaveBeenCalledWith(headers, {
      name: 'General',
      organizationId: 'org1',
    });
    expect(workspaces.addMember).toHaveBeenCalledWith(headers, 'team1', 'u1');
    expect(workspaces.setActive).toHaveBeenCalledWith(headers, 'team1');
  });

  /**
   * The failure mode this whole change exists to remove, reached from the
   * other side: an organization that exists, is owned, and cannot be opened.
   */
  it('discards the organization when the role that opens it cannot be written', async () => {
    const failure = new Error('role store unavailable');
    userRoles.setRolesForUser.mockRejectedValueOnce(failure);

    await expect(create({ name: 'Acme' })).rejects.toBe(failure);

    expect(organizations.delete).toHaveBeenCalledWith(headers, 'org1');
    // No half-built organization left behind for the caller to trip over.
    expect(workspaces.create).not.toHaveBeenCalled();
  });

  it('discards it too when a system role the grant needs is missing', async () => {
    roles.findOneByName.mockResolvedValue(None);

    await expect(create({ name: 'Acme' })).rejects.toThrow(/is missing/);
    expect(organizations.delete).toHaveBeenCalledWith(headers, 'org1');
  });

  it('reports the original failure even when the cleanup itself fails', async () => {
    const failure = new Error('role store unavailable');
    userRoles.setRolesForUser.mockRejectedValueOnce(failure);
    organizations.delete.mockRejectedValueOnce(new Error('delete failed too'));

    // The caller needs the reason they could not create a workspace, not a
    // second-order error about tidying up after it.
    await expect(create({ name: 'Acme' })).rejects.toBe(failure);
  });

  /**
   * The workspace is a convenience; the organization and the role that opens
   * it are not. Failing the request when the team could not be made would
   * tell the caller the organization does not exist when it does.
   */
  it('still answers the organization when the default workspace cannot be made', async () => {
    workspaces.create.mockRejectedValue(new Error('teams are unavailable'));

    expect(await create({ name: 'Acme' })).toBe('org1');
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', ['owner-role'], 'org1');
  });
});
