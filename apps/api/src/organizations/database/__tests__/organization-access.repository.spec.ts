import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationAccessRepository } from '../organization-access.repository';

describe('OrganizationAccessRepository', () => {
  const userRoles = { setRolesForUser: vi.fn() };
  const accessGrants = { delete: vi.fn() };
  const members = { findOne: vi.fn() };
  const sessions = { update: vi.fn() };
  let repository: OrganizationAccessRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    members.findOne.mockResolvedValue(null);
    repository = new OrganizationAccessRepository(
      userRoles as never,
      accessGrants as never,
      members as never,
      sessions as never,
    );
  });

  it('takes the roles, grants and session selection the organization gave', async () => {
    await repository.revokeFor('u1', 'org1');

    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', [], 'org1');
    expect(accessGrants.delete).toHaveBeenCalledWith({
      organizationId: 'org1',
      principalType: 'user',
      principalId: 'u1',
    });
    expect(sessions.update).toHaveBeenCalledWith(
      { userId: 'u1', activeOrganizationId: 'org1' },
      { activeOrganizationId: null, activeTeamId: null },
    );
  });

  it('moves a session to the organization the person joined first among those left', async () => {
    members.findOne.mockResolvedValue({ organizationId: 'org2' });

    await repository.revokeFor('u1', 'org1');

    expect(members.findOne).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      order: { createdAt: 'ASC' },
    });
    expect(sessions.update).toHaveBeenCalledWith(
      { userId: 'u1', activeOrganizationId: 'org1' },
      { activeOrganizationId: 'org2', activeTeamId: null },
    );
  });
});
