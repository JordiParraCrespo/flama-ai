import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ORGANIZATION_MEMBERSHIP_REPOSITORY } from '../../../access-control/access-control.di-tokens';
import type { OrganizationMembershipRepositoryPort } from '../../../access-control/database/organization-membership.repository.port';
import { ResourceAccessService } from '../../../access-control/services/resource-access.service';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { DOMAIN_RESOURCE_TYPE } from '../../services/domain-restrictable-resource';
import { SetUserDomainAccessCommand } from './set-user-domain-access.command';

/**
 * Replaces the set of domains a user may reach, within one organization.
 *
 * The storage is generic (`ResourceAccessService`); what stays here are the two
 * tenant boundaries, because only this module can check them:
 *
 * 1. **The target user must belong to the organization.** `userId` arrives from
 *    the path and is otherwise unconstrained, so without this an admin of
 *    organization A could restrict — or silently clear — the domain access of a
 *    user who only belongs to organization B.
 * 2. **Every domain id must exist in the organization.** Otherwise a caller
 *    could grant reach into another tenant's domain by id.
 */
@CommandHandler(SetUserDomainAccessCommand)
export class SetUserDomainAccessService
  implements ICommandHandler<SetUserDomainAccessCommand, void>
{
  constructor(
    private readonly resourceAccess: ResourceAccessService,
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
    @Inject(ORGANIZATION_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: OrganizationMembershipRepositoryPort,
  ) {}

  async execute(command: SetUserDomainAccessCommand): Promise<void> {
    const isMember = await this.membershipRepository.isMember(
      command.userId,
      command.organizationId,
    );
    // Reported as "not a member" rather than "no such user": the caller is
    // entitled to know about their own organization's membership and nothing
    // beyond it, so a user in another tenant looks identical to one that does
    // not exist.
    if (!isMember) {
      throw new AppError(DomainErrors.USER_NOT_IN_ORGANIZATION, {
        detail: `User ${command.userId} is not a member of this organization`,
        extensions: { userId: command.userId },
      });
    }

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

    await this.resourceAccess.replace(
      command.userId,
      command.organizationId,
      DOMAIN_RESOURCE_TYPE,
      requested,
    );
  }
}
