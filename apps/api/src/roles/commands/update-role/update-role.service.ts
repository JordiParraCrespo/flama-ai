import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import { RoleErrors } from '../../domain/role.errors';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { ROLE_REPOSITORY } from '../../roles.di-tokens';
import { UpdateRoleCommand } from './update-role.command';

/** Updates a role's description and/or its full permission set. */
@CommandHandler(UpdateRoleCommand)
export class UpdateRoleService implements ICommandHandler<UpdateRoleCommand, AggregateID> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<AggregateID> {
    const found = await this.roleRepository.findOneById(command.roleId);
    if (found.isNone()) throw new AppError(RoleErrors.NOT_FOUND);

    const role = found.unwrap();

    if (command.description !== undefined) {
      role.updateDescription(command.description);
    }
    if (command.permissions !== undefined) {
      role.replacePermissions(
        command.permissions.map((permission) => Permission.fromDefinition(permission)),
      );
    }

    await this.roleRepository.save(role);
    return role.id;
  }
}
