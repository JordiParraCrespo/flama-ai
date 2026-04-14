import { AppError } from '@flama/backend-core';
import type { TokenPair } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserTokenService } from '../../users/services/user-token.service';
import { UsersService } from '../../users/services/users.service';
import { AuthErrors } from '../errors/auth.errors';

@Injectable()
export class LoginService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userTokenService: UserTokenService,
  ) {}

  async execute(dto: { email: string; password: string }): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.password) {
      throw new AppError(AuthErrors.INVALID_CREDENTIALS);
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new AppError(AuthErrors.INVALID_CREDENTIALS);

    return this.userTokenService.generateAndStoreTokens(user.id, user.email, user.role);
  }
}
