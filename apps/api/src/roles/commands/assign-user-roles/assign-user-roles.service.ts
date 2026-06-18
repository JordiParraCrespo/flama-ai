import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { UserRepositoryPort } from '../../../users/database/user.repository.port';
import { UserErrors } from '../../../users/domain/user.errors';
import { USER_REPOSITORY } from '../../../users/user.di-tokens';
import type { RoleRepositoryPort } from '../../database/role.repository.port';
import type { UserRoleRepositoryPort } from '../../database/user-role.repository.port';
import { RoleErrors } from '../../domain/role.errors';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from '../../roles.di-tokens';
import { AssignUserRolesCommand } from './assign-user-roles.command';

/**
 * Replaces the set of roles assigned to a user. Validates that the user and
 * every referenced role exist before writing the join, so callers get a clean
 * 404 rather than a foreign-key error.
 */
@CommandHandler(AssignUserRolesCommand)
export class AssignUserRolesService implements ICommandHandler<AssignUserRolesCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: UserRoleRepositoryPort,
  ) {}

  async execute(command: AssignUserRolesCommand): Promise<void> {
    const user = await this.userRepository.findOneById(command.userId);
    if (user.isNone()) throw new AppError(UserErrors.NOT_FOUND);

    const uniqueRoleIds = [...new Set(command.roleIds)];
    const roles = await this.roleRepository.findByIds(uniqueRoleIds);
    if (roles.length !== uniqueRoleIds.length) throw new AppError(RoleErrors.NOT_FOUND);

    await this.userRoleRepository.setRolesForUser(command.userId, uniqueRoleIds);
  }
}
