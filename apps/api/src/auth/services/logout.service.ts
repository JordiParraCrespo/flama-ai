import { Injectable } from '@nestjs/common';
import { UserTokenService } from '../../users/services/user-token.service';

@Injectable()
export class LogoutService {
  constructor(private readonly userTokenService: UserTokenService) {}

  async execute(userId: string): Promise<void> {
    await this.userTokenService.revokeRefreshToken(userId);
  }
}
