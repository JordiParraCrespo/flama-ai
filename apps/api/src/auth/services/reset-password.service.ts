import { AppError } from '@flama/backend-core';
import { AUTH } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { AuthErrors } from '../errors/auth.errors';

@Injectable()
export class ResetPasswordService {
  constructor(private readonly usersService: UsersService) {}

  async execute(token: string, password: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user?.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new AppError(AuthErrors.INVALID_RESET_TOKEN);
    }

    const hashedPassword = await bcrypt.hash(password, AUTH.SALT_ROUNDS);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
