import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { OrganizationMembershipReaderPort } from '../../api-tokens/database/organization-membership.repository.port';
import { MemberOrmEntity } from './member.orm-entity';

/** The organizations a user belongs to, for the API-tokens port that asks. */
@Injectable()
export class OrganizationMembershipRepository implements OrganizationMembershipReaderPort {
  constructor(
    @InjectRepository(MemberOrmEntity)
    private readonly members: Repository<MemberOrmEntity>,
  ) {}

  async findOrganizationIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.members.find({ where: { userId }, select: { organizationId: true } });
    return rows.map((row) => row.organizationId);
  }
}
