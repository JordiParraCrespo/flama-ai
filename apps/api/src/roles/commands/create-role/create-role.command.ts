import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { PermissionDefinition } from '@flama/shared';

export class CreateRoleCommand extends CommandBase {
  readonly name: string;
  readonly description?: string;
  readonly permissions: PermissionDefinition[];

  readonly actorId?: string;
  readonly actorRole?: string;
  readonly activeOrganizationId?: string | null;

  constructor(props: CommandProps<CreateRoleCommand>) {
    super(props);
    this.name = props.name;
    this.description = props.description;
    this.permissions = props.permissions;
    this.actorId = props.actorId;
    this.actorRole = props.actorRole;
    this.activeOrganizationId = props.activeOrganizationId;
  }
}
