import { type AccessScope, ScopedRepositoryBase } from '@flama/backend-authz';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { Repository } from 'typeorm';
import { LeadResource } from '../leads.resource';
import { LeadOrmEntity } from './lead.orm-entity';
import type { LeadRepositoryPort } from './lead.repository.port';

/**
 * Leads, filtered by the caller's access scope.
 *
 * Note what is absent: there is no `WHERE organizationId = ...`, no team check,
 * no ownership test. Extending `ScopedRepositoryBase` and naming the resource
 * is the whole of it — the predicate is generated from the same declaration the
 * CASL conditions use, so a query and an `ability.can()` cannot disagree.
 *
 * `findById` returning `None` for a row outside the scope (rather than the row,
 * or a distinct "forbidden") is what keeps ids un-probeable: the controller
 * turns it into a 404 whether the lead is missing or merely unreachable.
 */
@Injectable()
export class LeadRepository
  extends ScopedRepositoryBase<LeadOrmEntity>
  implements LeadRepositoryPort
{
  protected readonly resource = LeadResource;
  protected readonly alias = 'lead';

  constructor(
    @InjectRepository(LeadOrmEntity)
    protected readonly repository: Repository<LeadOrmEntity>,
  ) {
    super();
  }

  async findAll(scope: AccessScope): Promise<LeadOrmEntity[]> {
    return this.scopedQuery(scope).orderBy('lead.createdAt', 'DESC').getMany();
  }

  async findById(scope: AccessScope, id: string): Promise<Option<LeadOrmEntity>> {
    const lead = await this.scopedQuery(scope).andWhere('lead.id = :id', { id }).getOne();
    return lead ? Some(lead) : None;
  }

  async countAll(scope: AccessScope): Promise<number> {
    return this.scopedQuery(scope).getCount();
  }

  async save(lead: LeadOrmEntity): Promise<LeadOrmEntity> {
    return this.repository.save(lead);
  }
}
