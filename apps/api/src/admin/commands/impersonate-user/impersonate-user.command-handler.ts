import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ADMIN_AUTH } from '../../admin.di-tokens';
import type { AdminAuthPort, SessionSwitch } from '../../infrastructure/admin-auth.port';
import { ImpersonateUserCommand } from './impersonate-user.command';

/** Starts acting as another account. The new session travels as a cookie the controller forwards. */
@CommandHandler(ImpersonateUserCommand)
export class ImpersonateUserCommandHandler
  implements ICommandHandler<ImpersonateUserCommand, SessionSwitch>
{
  constructor(
    @Inject(ADMIN_AUTH)
    private readonly admin: AdminAuthPort,
  ) {}

  execute(command: ImpersonateUserCommand): Promise<SessionSwitch> {
    return this.admin.impersonate(command.headers, command.userId);
  }
}
