import { AppError } from '@flama/backend-core';
import type { TokenPair } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { UserTokenService } from '../../users/services/user-token.service';
import { UsersService } from '../../users/services/users.service';
import { AuthErrors } from '../errors/auth.errors';

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userTokenService: UserTokenService,
  ) {}

  async execute(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await this.usersService.findById(userId);

    const isValid = await this.userTokenService.validateRefreshToken(userId, refreshToken);
    if (!isValid) throw new AppError(AuthErrors.ACCESS_DENIED);

    return this.userTokenService.generateAndStoreTokens(user.id, user.email, user.role);
  }
}
