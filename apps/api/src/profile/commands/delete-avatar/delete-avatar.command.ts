import { CommandBase, type CommandProps } from '@flama/backend-ddd';

export class DeleteAvatarCommand extends CommandBase {
  readonly userId: string;

  constructor(props: CommandProps<DeleteAvatarCommand>) {
    super(props);
    this.userId = props.userId;
  }
}
