import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ADMIN_AUTH } from '../../admin.di-tokens';
import type { AdminAuthPort, SessionSwitch } from '../../infrastructure/admin-auth.port';
import { StopImpersonatingCommand } from './stop-impersonating.command';

/** Returns from an impersonation to the caller's own session. */
@CommandHandler(StopImpersonatingCommand)
export class StopImpersonatingCommandHandler
  implements ICommandHandler<StopImpersonatingCommand, SessionSwitch>
{
  constructor(
    @Inject(ADMIN_AUTH)
    private readonly admin: AdminAuthPort,
  ) {}

  execute(command: StopImpersonatingCommand): Promise<SessionSwitch> {
    return this.admin.stopImpersonating(command.headers);
  }
}
