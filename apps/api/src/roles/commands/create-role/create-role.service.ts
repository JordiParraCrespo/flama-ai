import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import { RoleEntity } from '../../domain/role.entity';
import { RoleErrors } from '../../domain/role.errors';
import { Permission } from '../../domain/value-objects/permission.value-object';
import { ROLE_REPOSITORY } from '../../roles.di-tokens';
import { CreateRoleCommand } from './create-role.command';

/** Creates a new custom role with its initial permission set. */
@CommandHandler(CreateRoleCommand)
export class CreateRoleService implements ICommandHandler<CreateRoleCommand, AggregateID> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(command: CreateRoleCommand): Promise<AggregateID> {
    const existing = await this.roleRepository.findOneByName(command.name);
    if (existing.isSome()) throw new AppError(RoleErrors.NAME_TAKEN);

    const role = RoleEntity.createNew({
      name: command.name,
      description: command.description,
      permissions: command.permissions.map((permission) => Permission.fromDefinition(permission)),
    });

    await this.roleRepository.insert(role);
    return role.id;
  }
}
