import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationAccessRepository } from '../organization-access.repository';

describe('OrganizationAccessRepository', () => {
  const manager = {
    delete: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };
  const dataSource = {
    transaction: vi.fn(async (work: (m: typeof manager) => Promise<void>) => work(manager)),
  };
  const userRoles = { setRolesForUser: vi.fn() };
  let repository: OrganizationAccessRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    manager.findOne.mockResolvedValue(null);
    repository = new OrganizationAccessRepository(dataSource as never, userRoles as never);
  });

  it('takes the roles, grants and session selection in one transaction', async () => {
    await repository.revokeFor('u1', 'org1');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    // The roles are written on the same transaction, not one of their own.
    expect(userRoles.setRolesForUser).toHaveBeenCalledWith('u1', [], 'org1', manager);
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org1',
      principalType: 'user',
      principalId: 'u1',
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'u1', activeOrganizationId: 'org1' },
      { activeOrganizationId: null, activeTeamId: null },
    );
  });

  it('moves a session to the organization the person joined first among those left', async () => {
    manager.findOne.mockResolvedValue({ organizationId: 'org2' });

    await repository.revokeFor('u1', 'org1');

    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { userId: 'u1' },
      order: { createdAt: 'ASC' },
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'u1', activeOrganizationId: 'org1' },
      { activeOrganizationId: 'org2', activeTeamId: null },
    );
  });

  it('writes nothing past the step that failed, so the transaction rolls back whole', async () => {
    manager.delete.mockRejectedValueOnce(new Error('grants table locked'));

    await expect(repository.revokeFor('u1', 'org1')).rejects.toThrow('grants table locked');
    expect(manager.update).not.toHaveBeenCalled();
  });
});
