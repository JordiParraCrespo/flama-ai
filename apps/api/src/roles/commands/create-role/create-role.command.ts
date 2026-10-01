import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { PermissionDefinition } from '@flama/shared';

export class CreateRoleCommand extends CommandBase {
  readonly name: string;
  readonly description?: string;
  readonly permissions: PermissionDefinition[];

  readonly actorId?: string;
  readonly actorRole?: string;
  readonly activeOrganizationId?: string | null;
  /**
   * Create a global role (no organization) on purpose. Without it, a missing
   * `activeOrganizationId` is refused rather than read as "global"; with it,
   * the actor must hold `manage all`. `POST /v1/roles` sets it only for a
   * caller with no active organization whose ability holds `manage all`.
   */
  readonly global?: boolean;

  constructor(props: CommandProps<CreateRoleCommand>) {
    super(props);
    this.name = props.name;
    this.description = props.description;
    this.permissions = props.permissions;
    this.actorId = props.actorId;
    this.actorRole = props.actorRole;
    this.activeOrganizationId = props.activeOrganizationId;
    this.global = props.global;
  }
}
