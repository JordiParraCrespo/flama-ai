import { CommandBase, type CommandProps } from '@flama/backend-ddd';
import type { Role } from '@flama/shared';

export class UpdateUserCommand extends CommandBase {
  readonly userId: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly role?: Role;
  readonly isActive?: boolean;

  constructor(props: CommandProps<UpdateUserCommand>) {
    super(props);
    this.userId = props.userId;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.isActive = props.isActive;
  }
}
