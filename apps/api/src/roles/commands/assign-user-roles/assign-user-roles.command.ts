import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class AssignUserRolesCommand extends CommandBase {
  readonly userId: string;
  readonly roleIds: string[];

  constructor(props: CommandProps<AssignUserRolesCommand>) {
    super(props);
    this.userId = props.userId;
    this.roleIds = props.roleIds;
  }
}
