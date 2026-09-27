import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ADMIN_AUTH } from '../../admin.di-tokens';
import type { AdminUserResponseDto } from '../../dtos/admin-user.response.dto';
import type { AdminAuthPort } from '../../infrastructure/admin-auth.port';
import { BanUserCommand } from './ban-user.command';

/** Bans an account, for a while or for good. */
@CommandHandler(BanUserCommand)
export class BanUserCommandHandler
  implements ICommandHandler<BanUserCommand, AdminUserResponseDto>
{
  constructor(
    @Inject(ADMIN_AUTH)
    private readonly admin: AdminAuthPort,
  ) {}

  execute(command: BanUserCommand): Promise<AdminUserResponseDto> {
    return this.admin.banUser(command.headers, command.userId, command.ban);
  }
}
