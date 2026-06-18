import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import { RoleErrors } from '../../domain/role.errors';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { ROLE_REPOSITORY } from '../../roles.di-tokens';
import { UpdateRolePermissionsCommand } from './update-role-permissions.command';

/** Replaces a role's full permission set — the granular permission editor. */
@CommandHandler(UpdateRolePermissionsCommand)
export class UpdateRolePermissionsService
  implements ICommandHandler<UpdateRolePermissionsCommand, AggregateID>
{
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(command: UpdateRolePermissionsCommand): Promise<AggregateID> {
    const found = await this.roleRepository.findOneById(command.roleId);
    if (found.isNone()) throw new AppError(RoleErrors.NOT_FOUND);

    const role = found.unwrap();
    role.replacePermissions(
      command.permissions.map((permission) => Permission.fromDefinition(permission)),
    );

    await this.roleRepository.save(role);
    return role.id;
  }
}
