import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { OrganizationMembershipPort } from '../../auth/application/organization-membership.port';
import { MemberOrmEntity } from './member.orm-entity';

/** The organizations a user belongs to, for the kernel port that asks. */
@Injectable()
export class OrganizationMembershipRepository implements OrganizationMembershipPort {
  constructor(
    @InjectRepository(MemberOrmEntity)
    private readonly members: Repository<MemberOrmEntity>,
  ) {}

  async findOrganizationIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.members.find({ where: { userId }, select: { organizationId: true } });
    return rows.map((row) => row.organizationId);
  }
}
