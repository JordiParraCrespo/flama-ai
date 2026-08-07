import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import type { UserDomainAccessRepositoryPort } from '../../database/user-domain-access.repository.port';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY, USER_DOMAIN_ACCESS_REPOSITORY } from '../../domain.di-tokens';
import { SetUserDomainAccessCommand } from './set-user-domain-access.command';

/**
 * Replaces the set of domains a user may reach.
 *
 * Every id is verified to exist **in the caller's organization** before
 * anything is written. Without that check an admin could grant access to a
 * domain id belonging to another tenant, and the join row would silently widen
 * that user's reach across the tenant boundary.
 */
@CommandHandler(SetUserDomainAccessCommand)
export class SetUserDomainAccessService
  implements ICommandHandler<SetUserDomainAccessCommand, void>
{
  constructor(
    @Inject(USER_DOMAIN_ACCESS_REPOSITORY)
    private readonly userDomainAccessRepository: UserDomainAccessRepositoryPort,
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
  ) {}

  async execute(command: SetUserDomainAccessCommand): Promise<void> {
    const requested = [...new Set(command.domainIds)];

    if (requested.length > 0) {
      const found = await this.domainRepository.findByIds(command.organizationId, requested);
      const foundIds = new Set(found.map((domain) => domain.id));
      const unknown = requested.filter((id) => !foundIds.has(id));

      if (unknown.length > 0) {
        throw new AppError(DomainErrors.NOT_FOUND, {
          detail: `Unknown domain ids for this organization: ${unknown.join(', ')}`,
          extensions: { domainIds: unknown },
        });
      }
    }

    await this.userDomainAccessRepository.replaceForUser(command.userId, requested);
  }
}
