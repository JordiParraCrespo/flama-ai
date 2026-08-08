import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MemberOrmEntity } from '../../organizations/database/member.orm-entity';
import type { OrganizationMembershipRepositoryPort } from './organization-membership.repository.port';

/** TypeORM-backed adapter reading Better Auth's `member` table. */
@Injectable()
export class OrganizationMembershipRepository implements OrganizationMembershipRepositoryPort {
  constructor(
    @InjectRepository(MemberOrmEntity)
    private readonly repository: Repository<MemberOrmEntity>,
  ) {}

  async isMember(userId: string, organizationId: string): Promise<boolean> {
    return this.repository.existsBy({ userId, organizationId });
  }
}
