import type { AuthProvider, TokenPair } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { UserTokenService } from '../../users/services/user-token.service';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class ValidateOAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userTokenService: UserTokenService,
  ) {}

  async execute(profile: {
    email: string;
    firstName: string;
    lastName: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<TokenPair> {
    const user = await this.usersService.findOrCreateOAuthUser(profile);
    return this.userTokenService.generateAndStoreTokens(user.id, user.email, user.role);
  }
}
