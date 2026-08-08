import { describePermission, ungrantablePermissions } from '@flama/backend-authz';
import { AppError } from '@flama/backend-core';
import type { PermissionDefinition } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { RoleErrors } from '../domain/role.errors';
import { AbilityFactory } from './ability.factory';

/** Who is performing a role write, and in which organization. */
export interface RoleActor {
  id: string;
  role?: string;
  activeOrganizationId?: string | null;
}

/**
 * Enforces that a role write never grants more than its author holds.
 *
 * `grantableScopes` already stops a credential exceeding its creator; this is
 * the same invariant on the other escalation path. Without it, `update Role`
 * is effectively `manage all`: an org admin could write themselves a role that
 * outranks them and assign it in the same session.
 */
@Injectable()
export class RoleGrantPolicy {
  constructor(private readonly abilityFactory: AbilityFactory) {}

  async assertGrantable(
    actor: RoleActor | undefined,
    permissions: readonly PermissionDefinition[],
  ): Promise<void> {
    if (permissions.length === 0) return;

    // No actor means an internal caller (a seed, a migration backfill) rather
    // than a request. Those are trusted by construction — they are the code
    // that defines the system roles in the first place.
    if (!actor) return;

    const ability = await this.abilityFactory.createForUser(
      { id: actor.id, role: actor.role },
      { activeOrganizationId: actor.activeOrganizationId ?? null },
    );

    const ungrantable = ungrantablePermissions(ability, permissions);
    if (ungrantable.length === 0) return;

    throw new AppError(RoleErrors.PERMISSION_NOT_GRANTABLE, {
      detail: `You do not hold: ${ungrantable.map(describePermission).join(', ')}`,
      extensions: { ungrantable },
    });
  }
}
