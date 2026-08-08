import { None, Some } from 'oxide.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRepositoryPort } from '../../../../users/database/user.repository.port';
import { UserErrors } from '../../../../users/domain/user.errors';
import type { RoleRepositoryPort } from '../../../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../../database/user-role.repository.port';
import { RoleEntity } from '../../../domain/role.entity';
import { RoleErrors } from '../../../domain/role.errors';
import { AssignUserRolesCommand } from '../assign-user-roles.command';
import { AssignUserRolesService } from '../assign-user-roles.service';

function makeRole(id: string): RoleEntity {
  return RoleEntity.create({
    id,
    props: {
      name: `role-${id}`,
      description: null,
      isSystem: false,
      organizationId: null,
      permissions: [],
    },
  });
}

describe('AssignUserRolesService', () => {
  let service: AssignUserRolesService;
  let userRepo: Pick<UserRepositoryPort, 'findOneById'>;
  let roleRepo: Pick<RoleRepositoryPort, 'findByIds'>;
  let userRoleRepo: UserRoleRepositoryPort;

  beforeEach(() => {
    userRepo = {
      findOneById: vi.fn().mockResolvedValue(Some({ id: 'user-1' })),
    };
    roleRepo = {
      findByIds: vi.fn().mockResolvedValue([makeRole('r1'), makeRole('r2')]),
    };
    userRoleRepo = {
      findRoleIdsForUser: vi.fn(),
      findRolesForUser: vi.fn(),
      setRolesForUser: vi.fn().mockResolvedValue(undefined),
    };
    service = new AssignUserRolesService(
      userRepo as UserRepositoryPort,
      roleRepo as RoleRepositoryPort,
      userRoleRepo,
    );
  });

  it('replaces the user role assignments with the referenced roles', async () => {
    await service.execute(new AssignUserRolesCommand({ userId: 'user-1', roleIds: ['r1', 'r2'] }));

    expect(userRoleRepo.setRolesForUser).toHaveBeenCalledWith('user-1', ['r1', 'r2']);
  });

  it('throws USER NOT_FOUND when the user does not exist', async () => {
    vi.mocked(userRepo.findOneById).mockResolvedValue(None);

    await expect(
      service.execute(new AssignUserRolesCommand({ userId: 'missing', roleIds: ['r1'] })),
    ).rejects.toMatchObject({ code: UserErrors.NOT_FOUND.code });
    expect(roleRepo.findByIds).not.toHaveBeenCalled();
    expect(userRoleRepo.setRolesForUser).not.toHaveBeenCalled();
  });

  it('throws ROLE NOT_FOUND when a referenced role does not resolve', async () => {
    vi.mocked(roleRepo.findByIds).mockResolvedValue([makeRole('r1')]);

    await expect(
      service.execute(
        new AssignUserRolesCommand({
          userId: 'user-1',
          roleIds: ['r1', 'missing'],
        }),
      ),
    ).rejects.toMatchObject({ code: RoleErrors.NOT_FOUND.code });
    expect(userRoleRepo.setRolesForUser).not.toHaveBeenCalled();
  });

  it('deduplicates role ids before validating and writing the join', async () => {
    vi.mocked(roleRepo.findByIds).mockResolvedValue([makeRole('r1')]);

    await service.execute(new AssignUserRolesCommand({ userId: 'user-1', roleIds: ['r1', 'r1'] }));

    expect(roleRepo.findByIds).toHaveBeenCalledWith(['r1']);
    expect(userRoleRepo.setRolesForUser).toHaveBeenCalledWith('user-1', ['r1']);
  });
});
