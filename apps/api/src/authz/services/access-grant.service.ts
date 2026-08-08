import { type AccessScope, canGrantScope, ResourceRegistry } from '@flama/backend-authz';
import { AppError } from '@flama/backend-core';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { MemberOrmEntity } from '../../organizations/database/member.orm-entity';
import { TeamOrmEntity } from '../../organizations/database/team.orm-entity';
import { RoleOrmEntity } from '../../roles/database/role.orm-entity';
import {
  AccessGrantOrmEntity,
  type AccessGrantPrincipalType,
} from '../database/access-grant.orm-entity';
import { AccessGrantErrors } from '../domain/access-grant.errors';

export interface CreateAccessGrantInput {
  principalType: AccessGrantPrincipalType;
  principalId: string;
  resourceType: string;
  resourceId?: string | null;
  expiresAt?: string | null;
}

/**
 * Access-grant reads and writes.
 *
 * Every write goes through two checks, in this order:
 *
 * 1. **Containment** — the granter may only pass on reach they already hold
 *    (`canGrantScope`). Without it these endpoints are a self-service
 *    escalation path, which is why they could not ship before the check did.
 * 2. **Principal residency** — the user, team or role being granted access must
 *    belong to the organization. Otherwise a grant could name an outsider and
 *    quietly bridge two tenants.
 */
@Injectable()
export class AccessGrantService {
  private readonly logger = new Logger(AccessGrantService.name);

  constructor(
    @InjectRepository(AccessGrantOrmEntity)
    private readonly grants: Repository<AccessGrantOrmEntity>,
    @InjectRepository(MemberOrmEntity)
    private readonly members: Repository<MemberOrmEntity>,
    @InjectRepository(TeamOrmEntity)
    private readonly teams: Repository<TeamOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roles: Repository<RoleOrmEntity>,
    private readonly registry: ResourceRegistry,
  ) {}

  async list(scope: AccessScope): Promise<AccessGrantOrmEntity[]> {
    if (!scope.organizationId) {
      throw new AppError(AccessGrantErrors.NO_ACTIVE_ORGANIZATION);
    }
    return this.grants.find({
      where: { organizationId: scope.organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(scope: AccessScope, input: CreateAccessGrantInput): Promise<AccessGrantOrmEntity> {
    if (!scope.organizationId) {
      throw new AppError(AccessGrantErrors.NO_ACTIVE_ORGANIZATION);
    }

    // An unknown subject is a warning, not a rejection: the catalog is
    // advisory, and admins may grant over a resource this deployment has not
    // declared. But it is worth saying out loud, because the usual cause is a
    // typo that will silently never match a row.
    if (!this.registry.get(input.resourceType)) {
      this.logger.warn({
        message: 'Access grant references an unregistered resource type',
        resourceType: input.resourceType,
      });
    }

    const resourceId = input.resourceId ?? null;

    if (
      !canGrantScope(scope, {
        organizationId: scope.organizationId,
        resourceType: input.resourceType,
        resourceId,
      })
    ) {
      throw new AppError(AccessGrantErrors.NOT_GRANTABLE, {
        detail:
          resourceId === null
            ? `Granting every ${input.resourceType} requires holding every ${input.resourceType}`
            : `You do not hold ${input.resourceType} ${resourceId}`,
      });
    }

    await this.assertPrincipalBelongs(scope.organizationId, input.principalType, input.principalId);

    const grant = this.grants.create({
      organizationId: scope.organizationId,
      principalType: input.principalType,
      principalId: input.principalId,
      resourceType: input.resourceType,
      resourceId,
      grantedBy: scope.userId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    return this.grants.save(grant);
  }

  async revoke(scope: AccessScope, id: string): Promise<void> {
    if (!scope.organizationId) {
      throw new AppError(AccessGrantErrors.NO_ACTIVE_ORGANIZATION);
    }

    // Scoped to the organization, so a grant in another tenant reports as not
    // found rather than forbidden — ids stay un-probeable.
    const result = await this.grants.delete({ id, organizationId: scope.organizationId });
    if (!result.affected) {
      throw new AppError(AccessGrantErrors.NOT_FOUND, { detail: `No access grant with id ${id}` });
    }
  }

  private async assertPrincipalBelongs(
    organizationId: string,
    principalType: AccessGrantPrincipalType,
    principalId: string,
  ): Promise<void> {
    const exists = await this.principalExists(organizationId, principalType, principalId);
    if (!exists) {
      throw new AppError(AccessGrantErrors.PRINCIPAL_OUTSIDE_ORGANIZATION, {
        detail: `${principalType} ${principalId} is not part of this organization`,
      });
    }
  }

  private async principalExists(
    organizationId: string,
    principalType: AccessGrantPrincipalType,
    principalId: string,
  ): Promise<boolean> {
    if (principalType === 'user') {
      return this.members.existsBy({ organizationId, userId: principalId });
    }
    if (principalType === 'team') {
      return this.teams.existsBy({ organizationId, id: principalId });
    }
    // A role is addressable if it belongs to this organization, or is one of
    // the global templates every organization shares.
    const scoped = await this.roles.existsBy({ id: principalId, organizationId });
    return scoped || this.roles.existsBy({ id: principalId, organizationId: IsNull() });
  }
}
