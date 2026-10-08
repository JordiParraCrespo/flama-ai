import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Session } from '../../auth/database/session.orm-entity';
import { AccessGrantOrmEntity } from '../../authz/database/access-grant.orm-entity';
import type { UserRoleRepositoryPort } from '../../roles/database/user-role.repository.port';
import { USER_ROLE_REPOSITORY } from '../../roles/roles.di-tokens';
import { MemberOrmEntity } from './member.orm-entity';
import type { OrganizationAccessRepositoryPort } from './organization-access.repository.port';

/**
 * The roles go through `UserRoleRepositoryPort` — `user_role` stays the roles
 * module's to write — and the grants and session selection are written here,
 * on the tables that hold them.
 */
@Injectable()
export class OrganizationAccessRepository implements OrganizationAccessRepositoryPort {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
    @InjectRepository(AccessGrantOrmEntity)
    private readonly accessGrants: Repository<AccessGrantOrmEntity>,
    @InjectRepository(MemberOrmEntity)
    private readonly members: Repository<MemberOrmEntity>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
  ) {}

  async revokeFor(userId: string, organizationId: string): Promise<void> {
    await this.userRoles.setRolesForUser(userId, [], organizationId);
    await this.accessGrants.delete({
      organizationId,
      principalType: 'user',
      principalId: userId,
    });

    // Better Auth has already removed this membership, so every row left is an
    // organization the person is still in — and so may still act in.
    const fallback = await this.members.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    await this.sessions.update(
      { userId, activeOrganizationId: organizationId },
      { activeOrganizationId: fallback?.organizationId ?? null, activeTeamId: null },
    );
  }
}
