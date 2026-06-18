import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { PermissionDefinition } from '@flama/shared';

export class UpdateRolePermissionsCommand extends CommandBase {
  readonly roleId: string;
  readonly permissions: PermissionDefinition[];

  constructor(props: CommandProps<UpdateRolePermissionsCommand>) {
    super(props);
    this.roleId = props.roleId;
    this.permissions = props.permissions;
  }
}
