import { defineAbilitiesFromPermissions, type PermissionDefinition } from '@flama/shared';
import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import { None } from 'oxide.ts';
import { describe, expect, it, vi } from 'vitest';
import type { AbilityFactory } from '../../../application/ability.factory';
import { RoleGrantPolicy } from '../../../application/role-grant.policy';
import type { RoleRepositoryPort } from '../../../database/role.repository.port';
import type { RoleEntity } from '../../../domain/role.entity';
import { RoleErrors } from '../../../domain/role.errors';
import { RoleMapper } from '../../../roles.mapper';
import type { CreateRoleCommand } from '../create-role.command';
import { CreateRoleCommandHandler } from '../create-role.command-handler';
import { CreateRoleHttpController } from '../create-role.http.controller';

/**
 * `POST /v1/roles` with no active organization: only a platform admin
 * (`manage all` in the platform scope) creates a global role. Everyone
 * else gets ROLE_008 rather than a role every tenant reads.
 */
describe('CreateRoleHttpController with no active organization', () => {
  const ADMIN: PermissionDefinition[] = [{ action: 'manage', subject: 'all' }];
  const NO_ROLE_RIGHTS: PermissionDefinition[] = [{ action: 'read', subject: 'Lead' }];

  function wiring(held: PermissionDefinition[]) {
    const ability = defineAbilitiesFromPermissions(held);
    const repo = {
      findOneByName: vi.fn().mockResolvedValue(None),
      insert: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new CreateRoleCommandHandler(
      repo as unknown as RoleRepositoryPort,
      new RoleGrantPolicy({
        createForUser: vi.fn().mockResolvedValue(ability),
      } as unknown as AbilityFactory),
    );
    const commandBus = {
      execute: vi.fn((command: CreateRoleCommand) => handler.execute(command)),
    };
    const queryBus = {
      execute: vi.fn(async () => vi.mocked(repo.insert).mock.calls[0]?.[0] as RoleEntity),
    };
    const controller = new CreateRoleHttpController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      new RoleMapper(),
    );
    // What the guards leave on the request: no active organization.
    const request = { session: {} } as never;
    const create = () =>
      controller.create({ name: 'auditor', permissions: [] }, { id: 'user-1' }, request);
    return { repo, commandBus, create };
  }

  it('creates a global role for a platform admin (manage all)', async () => {
    const { repo, commandBus, create } = wiring(ADMIN);

    await create();

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrganizationId: null }),
    );
    const created = vi.mocked(repo.insert).mock.calls[0][0] as RoleEntity;
    expect(created.organizationId).toBeNull();
  });

  it('answers ROLE_008 to anyone else', async () => {
    const { repo, create } = wiring(NO_ROLE_RIGHTS);

    await expect(create()).rejects.toMatchObject({ code: RoleErrors.ORGANIZATION_REQUIRED.code });
    expect(repo.insert).not.toHaveBeenCalled();
  });
});
