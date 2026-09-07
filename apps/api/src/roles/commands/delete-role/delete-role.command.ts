import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class DeleteRoleCommand extends CommandBase {
  readonly roleId: string;
  readonly activeOrganizationId?: string | null;

  constructor(props: CommandProps<DeleteRoleCommand>) {
    super(props);
    this.roleId = props.roleId;
    this.activeOrganizationId = props.activeOrganizationId;
  }
}
