import type { AccessScope } from '@flama/backend-authz';
import type { Option } from 'oxide.ts';
import type { LeadOrmEntity } from './lead.orm-entity';

/**
 * Port for lead reads and writes.
 *
 * Every read takes an {@link AccessScope}: the signature is where "this query
 * is authorized" stops being a convention a handler has to remember and starts
 * being something the compiler asks for.
 */
export interface LeadRepositoryPort {
  findAll(scope: AccessScope): Promise<LeadOrmEntity[]>;
  /** `None` both for a missing lead and for one outside the caller's scope. */
  findById(scope: AccessScope, id: string): Promise<Option<LeadOrmEntity>>;
  countAll(scope: AccessScope): Promise<number>;
  save(lead: LeadOrmEntity): Promise<LeadOrmEntity>;
}
