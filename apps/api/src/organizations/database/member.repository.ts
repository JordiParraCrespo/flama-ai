import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { In, type Repository } from 'typeorm';
import { RoleOrmEntity } from '../../roles/database/role.orm-entity';
import { UserRoleOrmEntity } from '../../roles/database/user-role.orm-entity';
import { UserOrmEntity } from '../../users/database/user.orm-entity';
import type { AssignedRole, Member, MemberUser } from '../domain/membership.types';
import { OrganizationMapper } from '../organization.mapper';
import { MemberOrmEntity } from './member.orm-entity';
import type { MemberRepositoryPort } from './member.repository.port';

@Injectable()
export class MemberRepository implements MemberRepositoryPort {
  constructor(
    @InjectRepository(MemberOrmEntity)
    private readonly members: Repository<MemberOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoles: Repository<UserRoleOrmEntity>,
  ) {}

  async findMembership(organizationId: string, userId: string): Promise<Option<Member>> {
    const row = await this.members.findOne({ where: { organizationId, userId } });
    return row ? Some(OrganizationMapper.toMember(row)) : None;
  }

  async findMembershipById(organizationId: string, memberId: string): Promise<Option<Member>> {
    const row = await this.members.findOne({ where: { organizationId, id: memberId } });
    return row ? Some(OrganizationMapper.toMember(row)) : None;
  }

  async findAccounts(userIds: string[]): Promise<MemberUser[]> {
    if (userIds.length === 0) return [];
    const users = await this.users.find({ where: { id: In(userIds) } });
    return users.map(OrganizationMapper.toAccount);
  }

  async findAssignedRoles(
    userIds: string[],
    organizationId: string,
  ): Promise<Map<string, AssignedRole[]>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.userRoles
      .createQueryBuilder('assignment')
      .innerJoin(RoleOrmEntity, 'role', 'role.id = assignment.roleId')
      .select('assignment.userId', 'userId')
      .addSelect('role.id', 'id')
      .addSelect('role.name', 'name')
      .where('assignment.userId IN (:...userIds)', { userIds })
      .andWhere(
        '(assignment.organizationId = :organizationId OR assignment.organizationId IS NULL)',
        { organizationId },
      )
      .getRawMany();

    return OrganizationMapper.toAssignedRolesByUser(rows);
  }
}
