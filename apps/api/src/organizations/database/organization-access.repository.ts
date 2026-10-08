import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { Session } from '../../auth/database/session.orm-entity';
import { AccessGrantOrmEntity } from '../../authz/database/access-grant.orm-entity';
import { inTransaction } from '../../database/transaction-context';
import type { UserRoleRepositoryPort } from '../../roles/database/user-role.repository.port';
import { USER_ROLE_REPOSITORY } from '../../roles/roles.di-tokens';
import { MemberOrmEntity } from './member.orm-entity';
import type { OrganizationAccessRepositoryPort } from './organization-access.repository.port';

/**
 * One transaction for the three writes, so a failure part way leaves the
 * person exactly as they were rather than with no roles but a grant or a
 * session still reaching the organization. This repository opens it; the
 * roles go through `UserRoleRepositoryPort`, whose adapter joins it — `user_role`
 * stays the roles module's to write — and the grants and session selection are
 * written here, on the tables that hold them.
 */
@Injectable()
export class OrganizationAccessRepository implements OrganizationAccessRepositoryPort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
  ) {}

  async revokeFor(userId: string, organizationId: string): Promise<void> {
    await inTransaction(this.dataSource, async (manager) => {
      await this.userRoles.setRolesForUser(userId, [], organizationId);
      await manager.delete(AccessGrantOrmEntity, {
        organizationId,
        principalType: 'user',
        principalId: userId,
      });

      // An organization the person is still in, and so may still act in — never
      // the one they are leaving, whether or not its row is gone yet.
      const fallback = await manager.findOne(MemberOrmEntity, {
        where: { userId, organizationId: Not(organizationId) },
        order: { createdAt: 'ASC' },
      });
      await manager.update(
        Session,
        { userId, activeOrganizationId: organizationId },
        { activeOrganizationId: fallback?.organizationId ?? null, activeTeamId: null },
      );
    });
  }
}
