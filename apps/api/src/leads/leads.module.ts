import { AuthzModule as AuthzKernelModule } from '@flama/backend-authz';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadOrmEntity } from './database/lead.orm-entity';
import { LeadRepository } from './database/lead.repository';
import { LEAD_REPOSITORY } from './leads.di-tokens';
import { LeadMapper } from './leads.mapper';
import { LeadResource } from './leads.resource';
import { FindLeadByIdHttpController } from './queries/find-lead-by-id/find-lead-by-id.http.controller';
import { FindLeadsHttpController } from './queries/find-leads/find-leads.http.controller';

/**
 * The reference module for the authorization kernel.
 *
 * Everything authorization-related it does is here: register the entity,
 * contribute the resource declaration, extend the scoped repository. No guard
 * is written, no tenant filter is hand-rolled, and the module cannot be
 * misconfigured silently — a declaration naming a column the table lacks fails
 * at boot, and a repository queried without a scope throws.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LeadOrmEntity]),
    AuthzKernelModule.forFeature([LeadResource]),
  ],
  // Static routes before parameterized ones.
  controllers: [FindLeadsHttpController, FindLeadByIdHttpController],
  providers: [{ provide: LEAD_REPOSITORY, useClass: LeadRepository }, LeadMapper],
  exports: [LEAD_REPOSITORY],
})
export class LeadsModule {}
